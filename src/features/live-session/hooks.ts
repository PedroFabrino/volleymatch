import { useTransition, useOptimistic, useRef, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { updateScore, finishMatch, cancelMatch } from './actions'
import { substitutePlayer, swapPositions, swapTeams } from './team-actions'
import { createClient } from '@/lib/supabase/client'
import type { PlayerWithStatus } from '@/lib/matchmaking'
import type { Session, Match, Player } from '@/types'
import { sortPlayersByPos } from '@/utils/sortPlayersByPos'

export function useScoreboard(
  session: Session, 
  match: Match, 
  players: Player[], 
  playersWithStatus: PlayerWithStatus[]
) {
  const [isPending, startTransition] = useTransition()
  const t = useTranslations('Scoreboard')
  
  // Timer State
  const [elapsed, setElapsed] = useState('00:00')
  const [subbingPlayer, setSubbingPlayer] = useState<{ id: string, name: string, team: 'a' | 'b' } | null>(null)
  const [swappingPlayer, setSwappingPlayer] = useState<{ id: string, name: string, team: 'a' | 'b', position: import('@/types/player').PlayerPosition } | null>(null)

  // Hoster Voting Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const activeVotesRef = useRef<Map<string, number>>(new Map())
  const lastScoreSnapshotRef = useRef<{ a: number, b: number } | null>(null)
  const voteDebounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Accordion states for portrait rosters and queue
  const [showTeamARoster, setShowTeamARoster] = useState(true)
  const [showTeamBRoster, setShowTeamBRoster] = useState(true)
  const [showQueue, setShowQueue] = useState(true)

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

  // Realtime subscription for hoster toast
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel('public:point_attributions_hoster')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'point_attributions', filter: `session_id=eq.${session.id}` },
        (payload) => {
          const newVote = payload.new
          
          if (
            !lastScoreSnapshotRef.current || 
            lastScoreSnapshotRef.current.a !== newVote.score_a || 
            lastScoreSnapshotRef.current.b !== newVote.score_b
          ) {
            activeVotesRef.current = new Map()
            lastScoreSnapshotRef.current = { a: newVote.score_a, b: newVote.score_b }
          }

          const currentVotes = activeVotesRef.current
          currentVotes.set(newVote.attributed_to, (currentVotes.get(newVote.attributed_to) || 0) + 1)

          if (voteDebounceTimeoutRef.current) clearTimeout(voteDebounceTimeoutRef.current)
          
          voteDebounceTimeoutRef.current = setTimeout(() => {
            let maxVotes = 0
            let winnerId: string | null = null
            
            activeVotesRef.current.forEach((votes, playerId) => {
              if (votes > maxVotes) {
                maxVotes = votes
                winnerId = playerId
              }
            })

            if (winnerId) {
              const winnerPlayer = players.find(p => p.id === winnerId)
              if (winnerPlayer) {
                setToastMessage(t('spectatorVotedToast', { name: winnerPlayer.name }))
                setTimeout(() => setToastMessage(null), 4000)
              }
            }
          }, 10000)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      if (voteDebounceTimeoutRef.current) clearTimeout(voteDebounceTimeoutRef.current)
    }
  }, [session.id, players, t])

  // Optimistic UI states for instant feedback
  const [optScoreA, addOptScoreA] = useOptimistic(
    match.team_a_score,
    (state: number, increment: number) => Math.max(0, state + increment)
  )

  const [optScoreB, addOptScoreB] = useOptimistic(
    match.team_b_score,
    (state: number, increment: number) => Math.max(0, state + increment)
  )
  
  const touchStartY = useRef<number | null>(null)

  const handleScoreChange = (team: 'a' | 'b', increment: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    startTransition(() => {
      if (team === 'a') addOptScoreA(increment)
      if (team === 'b') addOptScoreB(increment)
      updateScore(match.id, session.id, team, increment)
    })
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent, team: 'a' | 'b') => {
    if (touchStartY.current === null) return
    const touchEndY = e.changedTouches[0].clientY
    const diff = touchEndY - touchStartY.current

    if (diff > 50) {
      handleScoreChange(team, -1)
    }
    touchStartY.current = null
  }

  const handleSubstitute = (playerInId: string) => {
    if (!subbingPlayer) return
    startTransition(() => {
      substitutePlayer(match.id, session.id, subbingPlayer.team, subbingPlayer.id, playerInId)
      setSubbingPlayer(null)
    })
  }

  const handleSwapPositions = (targetId: string) => {
    if (!swappingPlayer) return
    startTransition(() => {
      swapPositions(match.id, session.id, swappingPlayer.id, targetId)
      setSwappingPlayer(null)
    })
  }

  const handleCancelMatch = () => startTransition(() => cancelMatch(match.id, session.id))
  const handleSwapTeams = () => startTransition(() => swapTeams(match.id, session.id))
  const handleFinishEarly = () => startTransition(() => finishMatch(match.id, session.id))

  let currentTarget = session.target_score;
  let isMatchOver = false;

  if (session.tie_breaker_rule === 'flat_plus_3') {
    if (optScoreA >= session.target_score - 1 && optScoreB >= session.target_score - 1) {
      currentTarget = session.target_score + 2;
    }
    isMatchOver = optScoreA >= currentTarget || optScoreB >= currentTarget;
  } else {
    const reachedTarget = optScoreA >= session.target_score || optScoreB >= session.target_score;
    const diff = Math.abs(optScoreA - optScoreB);
    isMatchOver = reachedTarget && diff >= 2;
  }

  const teamAPlayers = match.team_a_players.map((id: string) => players.find(p => p.id === id)).filter(Boolean) as Player[]
  const teamBPlayers = match.team_b_players.map((id: string) => players.find(p => p.id === id)).filter(Boolean) as Player[]
  const benchedPlayers = players.filter(p => p.is_present_today && !match.team_a_players.includes(p.id) && !match.team_b_players.includes(p.id))

  const playingIds = new Set([...match.team_a_players, ...match.team_b_players]);
  const queuedPlayers = playersWithStatus.filter(p => !playingIds.has(p.id));

  const sortedQueuedPlayers = [...queuedPlayers].sort((a, b) => {
    if (a.draftStatus === 'in_next_match' && b.draftStatus !== 'in_next_match') return -1;
    if (a.draftStatus !== 'in_next_match' && b.draftStatus === 'in_next_match') return 1;
    return 0;
  });

  const sortedTeamA = sortPlayersByPos(teamAPlayers, match.team_a_positions);
  const sortedTeamB = sortPlayersByPos(teamBPlayers, match.team_b_positions);

  return {
    isPending,
    startTransition,
    elapsed,
    subbingPlayer,
    setSubbingPlayer,
    swappingPlayer,
    setSwappingPlayer,
    toastMessage,
    showTeamARoster,
    setShowTeamARoster,
    showTeamBRoster,
    setShowTeamBRoster,
    showQueue,
    setShowQueue,
    optScoreA,
    optScoreB,
    handleScoreChange,
    handleTouchStart,
    handleTouchEnd,
    handleSubstitute,
    handleSwapPositions,
    handleCancelMatch,
    handleSwapTeams,
    handleFinishEarly,
    currentTarget,
    isMatchOver,
    benchedPlayers,
    sortedQueuedPlayers,
    sortedTeamA,
    sortedTeamB
  }
}
