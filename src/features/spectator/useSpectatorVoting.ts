import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { submitPointAttribution } from './actions'
import type { Match } from '@/types'

export type VotingPrompt = {
  id: string
  team: 'a' | 'b'
  scoreA: number
  scoreB: number
}

type VotingState = 'idle' | 'voting' | 'voted'

type UseSpectatorVotingOptions = {
  match: Match
  sessionId: string
  votedForLabel: (name: string) => string
}

function buildPromptId(scoreA: number, scoreB: number) {
  return `${scoreA}-${scoreB}`
}

function buildPrompt(team: 'a' | 'b', scoreA: number, scoreB: number): VotingPrompt {
  return { id: buildPromptId(scoreA, scoreB), team, scoreA, scoreB }
}

export function useSpectatorVoting({ match, sessionId, votedForLabel }: UseSpectatorVotingOptions) {
  const [promptQueue, setPromptQueue] = useState<VotingPrompt[]>([])
  const [votingState, setVotingState] = useState<VotingState>('idle')
  const [votingTeam, setVotingTeam] = useState<'a' | 'b' | null>(null)
  const [votingScoreSnapshot, setVotingScoreSnapshot] = useState<{ a: number; b: number } | null>(null)
  const votingScoreSnapshotRef = useRef<{ a: number; b: number } | null>(null)
  const [voteCounts, setVoteCounts] = useState<Map<string, number>>(new Map())
  const [myVote, setMyVote] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(10)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const prevScoreRef = useRef({ a: match.team_a_score, b: match.team_b_score })

  const activePromptId = promptQueue[0]?.id ?? null
  const promptQueueRef = useRef(promptQueue)
  promptQueueRef.current = promptQueue

  const getVoterToken = useCallback(() => {
    let token = localStorage.getItem('volleymatch_voter_token')
    if (!token) {
      token = crypto.randomUUID()
      localStorage.setItem('volleymatch_voter_token', token)
    }
    return token
  }, [])

  const dismissCurrentPrompt = useCallback(() => {
    setPromptQueue((prev) => prev.slice(1))
    setToastMessage(null)
  }, [])

  const activatePrompt = useCallback((prompt: VotingPrompt) => {
    const snap = { a: prompt.scoreA, b: prompt.scoreB }
    setVotingTeam(prompt.team)
    setVotingScoreSnapshot(snap)
    votingScoreSnapshotRef.current = snap
    setCountdown(10)
    setVoteCounts(new Map())
    setToastMessage(null)

    getVoterToken()
    const storedKey = `volleymatch_vote_${match.id}_${prompt.scoreA}_${prompt.scoreB}`
    const alreadyVotedFor = localStorage.getItem(storedKey)
    if (alreadyVotedFor) {
      setMyVote(alreadyVotedFor)
      setVotingState('voted')
    } else {
      setMyVote(null)
      setVotingState('voting')
    }
  }, [getVoterToken, match.id])

  useEffect(() => {
    const prompt = promptQueueRef.current[0]
    if (prompt) {
      activatePrompt(prompt)
      return
    }

    setVotingState('idle')
    setVotingTeam(null)
    setVotingScoreSnapshot(null)
    votingScoreSnapshotRef.current = null
    setMyVote(null)
    setVoteCounts(new Map())
  }, [activePromptId, activatePrompt])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel(`spectator:point_attributions:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'point_attributions',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const newVote = payload.new
          const snap = votingScoreSnapshotRef.current
          if (snap && snap.a === newVote.score_a && snap.b === newVote.score_b) {
            setVoteCounts((prev) => {
              const next = new Map(prev)
              const count = next.get(newVote.attributed_to) || 0
              next.set(newVote.attributed_to, count + 1)
              return next
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId])

  useEffect(() => {
    const prev = prevScoreRef.current
    const newA = match.team_a_score
    const newB = match.team_b_score

    const totalNew = newA + newB
    const totalPrev = prev.a + prev.b

    if (totalNew > totalPrev) {
      const team: 'a' | 'b' = newA > prev.a ? 'a' : 'b'
      const prompt = buildPrompt(team, newA, newB)

      setPromptQueue((current) => {
        if (current.some((item) => item.id === prompt.id)) return current
        return [...current, prompt]
      })
    }

    prevScoreRef.current = { a: newA, b: newB }
  }, [match.team_a_score, match.team_b_score, match.id])

  useEffect(() => {
    if (!activePromptId) return

    let timer: NodeJS.Timeout
    if ((votingState === 'voting' || votingState === 'voted') && countdown > 0) {
      timer = setTimeout(() => setCountdown((current) => current - 1), 1000)
    } else if (countdown === 0) {
      timer = setTimeout(() => dismissCurrentPrompt(), 0)
    }

    return () => clearTimeout(timer)
  }, [activePromptId, votingState, countdown, dismissCurrentPrompt])

  const castVote = async (playerId: string, playerName: string) => {
    if (votingState !== 'voting' || !votingScoreSnapshot || !votingTeam) return

    setMyVote(playerId)
    setVotingState('voted')
    setToastMessage(votedForLabel(playerName))
    setTimeout(() => setToastMessage(null), 2000)

    const token = getVoterToken()
    const storedKey = `volleymatch_vote_${match.id}_${votingScoreSnapshot.a}_${votingScoreSnapshot.b}`
    localStorage.setItem(storedKey, playerId)

    await submitPointAttribution(
      match.id,
      sessionId,
      playerId,
      votingTeam,
      votingScoreSnapshot.a,
      votingScoreSnapshot.b,
      token
    )
  }

  return {
    votingState,
    votingTeam,
    countdown,
    voteCounts,
    myVote,
    toastMessage,
    castVote,
    dismissCurrentPrompt,
    queueLength: promptQueue.length,
  }
}
