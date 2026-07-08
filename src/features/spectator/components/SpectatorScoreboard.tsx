'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Clock, ChevronDown, ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { submitPointAttribution } from '../actions'

import { PlayerWithStatus } from '@/lib/matchmaking'
import { Session, Match } from '@/types'
import {
  SpectatorScorePanel,
  SpectatorRosterPanel,
  SpectatorQueuePanel,
  VotingOverlay,
} from './SpectatorPanels'

export default function SpectatorScoreboard({ session, match, playersWithStatus }: { session: Session, match: Match, playersWithStatus: PlayerWithStatus[] }) {
  const t = useTranslations('Scoreboard')

  // Accordion State
  const [teamsOpen, setTeamsOpen] = useState(false)
  const [queueOpen, setQueueOpen] = useState(true)

  // Timer State
  const [elapsed, setElapsed] = useState('00:00')

  // Voting State
  type VotingState = 'idle' | 'voting' | 'voted'
  const [votingState, setVotingState] = useState<VotingState>('idle')
  const [votingTeam, setVotingTeam] = useState<'a' | 'b' | null>(null)
  const [votingScoreSnapshot, setVotingScoreSnapshot] = useState<{ a: number; b: number } | null>(null)
  const votingScoreSnapshotRef = useRef<{ a: number; b: number } | null>(null)
  const [voteCounts, setVoteCounts] = useState<Map<string, number>>(new Map())
  const [myVote, setMyVote] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(10)
  const prevScoreRef = useRef({ a: match.team_a_score, b: match.team_b_score })
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  useEffect(() => {
    const startTime = new Date(match.created_at).getTime()
    
    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - startTime) / 1000)
      const m = Math.floor(diff / 60).toString().padStart(2, '0')
      const s = (diff % 60).toString().padStart(2, '0')
      setElapsed(`${m}:${s}`)
    }, 1000)

    return () => clearInterval(interval)
  }, [match.created_at])

  // Realtime subscription for votes
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel('public:point_attributions_spectator')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'point_attributions',
          filter: `session_id=eq.${session.id}`,
        },
        (payload) => {
          const newVote = payload.new
          const snap = votingScoreSnapshotRef.current
          if (snap && snap.a === newVote.score_a && snap.b === newVote.score_b) {
            setVoteCounts(prev => {
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
  }, [session.id])

  // Voting panel logic
  const getVoterToken = useCallback(() => {
    let token = localStorage.getItem('volleymatch_voter_token')
    if (!token) {
      token = crypto.randomUUID()
      localStorage.setItem('volleymatch_voter_token', token)
    }
    return token
  }, [])

  const openVotingPanel = useCallback((team: 'a' | 'b', scoreA: number, scoreB: number) => {
    setVotingTeam(team)
    const snap = { a: scoreA, b: scoreB }
    setVotingScoreSnapshot(snap)
    votingScoreSnapshotRef.current = snap
    setVotingState('voting')
    setCountdown(10)
    setVoteCounts(new Map())
    setToastMessage(null)
    
    getVoterToken() // ensure token exists
    const storedKey = `volleymatch_vote_${match.id}_${scoreA}_${scoreB}`
    const alreadyVotedFor = localStorage.getItem(storedKey)
    if (alreadyVotedFor) {
      setMyVote(alreadyVotedFor)
      setVotingState('voted')
    } else {
      setMyVote(null)
    }
  }, [match.id, getVoterToken])

  useEffect(() => {
    const prev = prevScoreRef.current
    const newA = match.team_a_score
    const newB = match.team_b_score

    const totalNew = newA + newB
    const totalPrev = prev.a + prev.b

    if (totalNew > totalPrev) {
      if (newA > prev.a) {
        openVotingPanel('a', newA, newB)
      } else if (newB > prev.b) {
        openVotingPanel('b', newA, newB)
      }
    }

    prevScoreRef.current = { a: newA, b: newB }
  }, [match.team_a_score, match.team_b_score, match.id, openVotingPanel])

  useEffect(() => {
    let timer: NodeJS.Timeout
    if ((votingState === 'voting' || votingState === 'voted') && countdown > 0) {
      timer = setTimeout(() => setCountdown(c => c - 1), 1000)
    } else if (countdown === 0 && votingState !== 'idle') {
      timer = setTimeout(() => setVotingState('idle'), 0)
    }
    return () => clearTimeout(timer)
  }, [votingState, countdown])

  const castVote = async (playerId: string, playerName: string) => {
    if (votingState !== 'voting' || !votingScoreSnapshot) return

    setMyVote(playerId)
    setVotingState('voted')
    setToastMessage(t('votedFor', { name: playerName }))
    setTimeout(() => setToastMessage(null), 2000)

    const token = getVoterToken()
    const storedKey = `volleymatch_vote_${match.id}_${votingScoreSnapshot.a}_${votingScoreSnapshot.b}`
    localStorage.setItem(storedKey, playerId)

    await submitPointAttribution(
      match.id,
      session.id,
      playerId,
      votingTeam!,
      votingScoreSnapshot.a,
      votingScoreSnapshot.b,
      token
    )
  }

  const optScoreA = match.team_a_score
  const optScoreB = match.team_b_score

  const isMatchOver = optScoreA >= session.target_score || optScoreB >= session.target_score

  const teamAPlayers = match.team_a_players.map((id: string) => playersWithStatus.find(p => p.id === id)).filter(Boolean) as PlayerWithStatus[]
  const teamBPlayers = match.team_b_players.map((id: string) => playersWithStatus.find(p => p.id === id)).filter(Boolean) as PlayerWithStatus[]

  const benchPlayers = playersWithStatus.filter(p => !match.team_a_players.includes(p.id) && !match.team_b_players.includes(p.id))

  return (
    <div className="flex flex-col h-[80vh] bg-gray-900 overflow-hidden relative rounded-3xl border border-gray-800 shadow-2xl">
      <SpectatorScorePanel 
        elapsed={elapsed}
        targetScore={session.target_score}
        scoreA={optScoreA}
        scoreB={optScoreB}
      />

      <SpectatorRosterPanel 
        teamsOpen={teamsOpen}
        setTeamsOpen={setTeamsOpen}
        teamAPlayers={teamAPlayers}
        teamBPlayers={teamBPlayers}
        teamAPositions={match.team_a_positions}
        teamBPositions={match.team_b_positions}
      />

      <SpectatorQueuePanel 
        queueOpen={queueOpen}
        setQueueOpen={setQueueOpen}
        benchPlayers={benchPlayers}
        matchmakingMode={session.matchmaking_mode}
      />

      {isMatchOver && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm overflow-hidden flex flex-col items-center p-8 shadow-2xl">
            <h2 className="text-4xl font-black text-white mb-2 text-center uppercase tracking-wider">
              {t('matchDone')}
            </h2>
            <div className="flex items-center gap-4 text-3xl font-black mb-8">
              <span className="text-red-500">{optScoreA}</span>
              <span className="text-gray-500">-</span>
              <span className="text-blue-500">{optScoreB}</span>
            </div>
            <p className="text-gray-400 text-center animate-pulse">{t('waitingHost')}</p>
          </div>
        </div>
      )}

      <VotingOverlay 
        votingState={votingState}
        votingTeam={votingTeam}
        countdown={countdown}
        teamPlayers={votingTeam === 'a' ? teamAPlayers : teamBPlayers}
        voteCounts={voteCounts}
        myVote={myVote}
        castVote={castVote}
        toastMessage={toastMessage}
      />
    </div>
  )
}
