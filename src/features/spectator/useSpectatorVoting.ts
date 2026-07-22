import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { submitPointAttribution } from './actions'
import {
  buildScorePrompts,
  mergePromptQueue,
  type VotingPrompt,
} from './voting-prompts'
import { loadStoredQueue, saveStoredQueue } from './spectator-voting-storage'
import type { Match } from '@/types'
import type { ScoringType } from '@/types/pointAttribution'
import { parseStoredSpectatorVote } from '@/types/pointAttribution'

type VotingState = 'idle' | 'voting' | 'voted'
type VotingPhase = 'choose_player' | 'choose_type'

type UseSpectatorVotingOptions = {
  match: Match
  sessionId: string
  votedForLabel: (name: string, scoringType: ScoringType) => string
}

type MatchScoreRow = {
  team_a_score: number
  team_b_score: number
}

export function useSpectatorVoting({ match, sessionId, votedForLabel }: UseSpectatorVotingOptions) {
  const [promptQueue, setPromptQueue] = useState<VotingPrompt[]>(() => loadStoredQueue(match.id))
  const [votingState, setVotingState] = useState<VotingState>('idle')
  const [votingPhase, setVotingPhase] = useState<VotingPhase>('choose_player')
  const [votingTeam, setVotingTeam] = useState<'a' | 'b' | null>(null)
  const [votingScoreSnapshot, setVotingScoreSnapshot] = useState<{ a: number; b: number } | null>(null)
  const votingScoreSnapshotRef = useRef<{ a: number; b: number } | null>(null)
  const [voteCounts, setVoteCounts] = useState<Map<string, number>>(new Map())
  const [myVote, setMyVote] = useState<string | null>(null)
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [selectedPlayerName, setSelectedPlayerName] = useState<string | null>(null)
  const [selectedScoringType, setSelectedScoringType] = useState<ScoringType | null>(null)
  const [countdown, setCountdown] = useState(10)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const lastSeenScoresRef = useRef({ a: match.team_a_score, b: match.team_b_score })

  const previousMatchIdRef = useRef<string | null>(null)
  const submitInFlightRef = useRef(false)
  
  const votedForLabelRef = useRef(votedForLabel)
  useEffect(() => {
    votedForLabelRef.current = votedForLabel
  }, [votedForLabel])

  const activePromptId = promptQueue[0]?.id ?? null
  const promptQueueRef = useRef(promptQueue)
  const votingPhaseRef = useRef(votingPhase)
  const selectedPlayerIdRef = useRef(selectedPlayerId)
  const selectedPlayerNameRef = useRef(selectedPlayerName)
  const votingStateRef = useRef(votingState)

  useEffect(() => {
    promptQueueRef.current = promptQueue
    votingPhaseRef.current = votingPhase
    selectedPlayerIdRef.current = selectedPlayerId
    selectedPlayerNameRef.current = selectedPlayerName
    votingStateRef.current = votingState
  }, [promptQueue, votingPhase, selectedPlayerId, selectedPlayerName, votingState])

  const enqueuePrompts = useCallback((incoming: VotingPrompt[]) => {
    if (incoming.length === 0) return
    setPromptQueue((current) => mergePromptQueue(current, incoming))
  }, [])

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
    setVotingPhase('choose_player')
    setSelectedPlayerId(null)
    setSelectedPlayerName(null)
    setSelectedScoringType(null)
    submitInFlightRef.current = false
  }, [])

  const submitVote = useCallback(async (
    playerId: string,
    playerName: string,
    scoringType: ScoringType,
    options?: { showToast?: boolean },
  ) => {
    const snap = votingScoreSnapshotRef.current
    const team = votingTeam
    if (!snap || !team || submitInFlightRef.current) return

    submitInFlightRef.current = true
    setMyVote(playerId)
    setSelectedPlayerId(playerId)
    setSelectedPlayerName(playerName)
    setSelectedScoringType(scoringType)
    setVotingState('voted')

    if (options?.showToast !== false) {
      setToastMessage(votedForLabelRef.current(playerName, scoringType))
      setTimeout(() => setToastMessage(null), 2500)
    }

    const token = getVoterToken()
    const storedKey = `volleymatch_vote_${match.id}_${snap.a}_${snap.b}`
    localStorage.setItem(storedKey, JSON.stringify({ playerId, scoringType, playerName }))

    await submitPointAttribution(
      match.id,
      sessionId,
      playerId,
      team,
      snap.a,
      snap.b,
      token,
      scoringType,
    )
  }, [getVoterToken, match.id, sessionId])

  const activatePrompt = useCallback((prompt: VotingPrompt) => {
    const snap = { a: prompt.scoreA, b: prompt.scoreB }
    setVotingTeam(prompt.team)
    setVotingScoreSnapshot(snap)
    votingScoreSnapshotRef.current = snap
    setCountdown(10)
    setVoteCounts(new Map())
    setToastMessage(null)
    setVotingPhase('choose_player')
    setSelectedPlayerId(null)
    setSelectedPlayerName(null)
    setSelectedScoringType(null)
    submitInFlightRef.current = false

    getVoterToken()
    const storedKey = `volleymatch_vote_${match.id}_${prompt.scoreA}_${prompt.scoreB}`
    const raw = localStorage.getItem(storedKey)
    if (raw) {
      const stored = parseStoredSpectatorVote(raw)
      if (stored) {
        setMyVote(stored.playerId)
        setSelectedPlayerId(stored.playerId)
        setSelectedPlayerName(stored.playerName ?? null)
        setSelectedScoringType(stored.scoringType)
        setVotingPhase('choose_type')
        setVotingState('voted')
        return
      }
    }

    setMyVote(null)
    setVotingState('voting')
  }, [getVoterToken, match.id])

  useEffect(() => {
    saveStoredQueue(match.id, promptQueue)
  }, [match.id, promptQueue])

  useEffect(() => {
    const isNewMatch = previousMatchIdRef.current !== null && previousMatchIdRef.current !== match.id
    previousMatchIdRef.current = match.id
    lastSeenScoresRef.current = { a: match.team_a_score, b: match.team_b_score }

    if (isNewMatch) {
      setPromptQueue([])
    }
  }, [match.id, match.team_a_score, match.team_b_score])

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
    setVotingPhase('choose_player')
    setSelectedPlayerId(null)
    setSelectedPlayerName(null)
    setSelectedScoringType(null)
  }, [activePromptId, activatePrompt])

  useEffect(() => {
    const supabase = createClient()
    lastSeenScoresRef.current = { a: match.team_a_score, b: match.team_b_score }

    const scoreChannel = supabase.channel(`spectator:match-scores:${match.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${match.id}`,
        },
        (payload) => {
          const row = payload.new as MatchScoreRow
          const prev = lastSeenScoresRef.current
          const next = { a: row.team_a_score, b: row.team_b_score }
          const prompts = buildScorePrompts(prev, next)
          lastSeenScoresRef.current = next
          enqueuePrompts(prompts)
        }
      )
      .subscribe()

    const attributionChannel = supabase.channel(`spectator:point_attributions:${sessionId}`)
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
      supabase.removeChannel(scoreChannel)
      supabase.removeChannel(attributionChannel)
    }
  }, [match.id, sessionId, enqueuePrompts])

  useEffect(() => {
    if (!activePromptId) return

    let timer: NodeJS.Timeout
    if ((votingState === 'voting' || votingState === 'voted') && countdown > 0) {
      timer = setTimeout(() => setCountdown((current) => current - 1), 1000)
    } else if (countdown === 0) {
      timer = setTimeout(async () => {
        if (
          votingStateRef.current === 'voting'
          && votingPhaseRef.current === 'choose_type'
          && selectedPlayerIdRef.current
        ) {
          await submitVote(
            selectedPlayerIdRef.current,
            selectedPlayerNameRef.current ?? '',
            'other',
            { showToast: false },
          )
        }
        dismissCurrentPrompt()
      }, 0)
    }

    return () => clearTimeout(timer)
  }, [activePromptId, votingState, countdown, dismissCurrentPrompt, submitVote])

  const selectPlayer = (playerId: string, playerName: string) => {
    if (votingState !== 'voting' || votingPhase !== 'choose_player') return
    setSelectedPlayerId(playerId)
    setSelectedPlayerName(playerName)
    setVotingPhase('choose_type')
  }

  const selectScoringType = async (scoringType: ScoringType) => {
    if (votingState !== 'voting' || votingPhase !== 'choose_type') return
    if (!selectedPlayerId || !selectedPlayerName) return
    await submitVote(selectedPlayerId, selectedPlayerName, scoringType)
  }

  const hasPendingVoting = promptQueue.length > 0 || votingState !== 'idle'

  return {
    votingState,
    votingPhase,
    votingTeam,
    countdown,
    voteCounts,
    myVote,
    selectedPlayerId,
    selectedPlayerName,
    selectedScoringType,
    toastMessage,
    selectPlayer,
    selectScoringType,
    dismissCurrentPrompt,
    queueLength: promptQueue.length,
    hasPendingVoting,
  }
}

export type { VotingPrompt } from './voting-prompts'
