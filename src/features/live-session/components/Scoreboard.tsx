'use client'

import { useTransition, useOptimistic, useRef, useEffect, useState } from 'react'
import { updateScore, finishMatch, cancelMatch } from '../actions'
import { substitutePlayer, swapPositions, swapTeams } from '../team-actions'
import { Clock } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { PlayerWithStatus } from '@/lib/matchmaking'
import { createClient } from '@/lib/supabase/client'

import type { Session, Match, Player } from '@/types'

import { ScorePanel } from './ScorePanel'
import { RosterPanel } from './RosterPanel'
import { QueuePanel } from './QueuePanel'
import { AdminControls } from './AdminControls'
import { SubstitutionModal } from './SubstitutionModal'
import { SwapPositionModal } from './SwapPositionModal'
import { MatchOverModal } from './MatchOverModal'

export default function Scoreboard({ session, match, players, playersWithStatus }: { 
  session: Session, 
  match: Match, 
  players: Player[],
  playersWithStatus: PlayerWithStatus[]
}) {
  const [isPending, startTransition] = useTransition()
  const t = useTranslations('Scoreboard')
  
  // Timer State
  const [elapsed, setElapsed] = useState('00:00')
  const [subbingPlayer, setSubbingPlayer] = useState<{ id: string, name: string, team: 'a' | 'b' } | null>(null)
  const [swappingPlayer, setSwappingPlayer] = useState<{ id: string, name: string, team: 'a' | 'b', position: string } | null>(null)

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
                setToastMessage(`🗳️ Spectators: ${winnerPlayer.name} scored`)
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
  }, [session.id, players])

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

  const teamAPlayers = match.team_a_players.map((id: string) => players.find(p => p.id === id)).filter(Boolean)
  const teamBPlayers = match.team_b_players.map((id: string) => players.find(p => p.id === id)).filter(Boolean)
  const benchedPlayers = players.filter(p => p.is_present_today && !match.team_a_players.includes(p.id) && !match.team_b_players.includes(p.id))

  const playingIds = new Set([...match.team_a_players, ...match.team_b_players]);
  const queuedPlayers = playersWithStatus.filter(p => !playingIds.has(p.id));

  const sortedQueuedPlayers = [...queuedPlayers].sort((a, b) => {
    if (a.draftStatus === 'in_next_match' && b.draftStatus !== 'in_next_match') return -1;
    if (a.draftStatus !== 'in_next_match' && b.draftStatus === 'in_next_match') return 1;
    return 0;
  });

  const sortOrder = ['Setter', 'Middle Blocker', 'Outside Hitter', 'Opposite Hitter', 'Libero', 'Any'];
  const sortPlayersByPos = (teamPlayers: Player[], positions?: Record<string, string>) => {
    return [...teamPlayers].sort((a, b) => {
      const posA = (positions && positions[a.id] && positions[a.id] !== 'Any') ? positions[a.id] : (a.positions?.[0] || 'Any');
      const posB = (positions && positions[b.id] && positions[b.id] !== 'Any') ? positions[b.id] : (b.positions?.[0] || 'Any');
      const indexA = sortOrder.indexOf(posA);
      const indexB = sortOrder.indexOf(posB);
      return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
    });
  }

  const sortedTeamA = sortPlayersByPos(teamAPlayers, match.team_a_positions);
  const sortedTeamB = sortPlayersByPos(teamBPlayers, match.team_b_positions);

  return (
    <div className="flex flex-col h-screen bg-gray-900 overflow-hidden relative">
      
      {/* SCOREBOARD SECTION */}
      <div className="relative flex flex-row w-full landscape:h-screen portrait:h-[40vh] portrait:shrink-0">
        
        {/* Top Bar Overlay */}
        <div className="flex justify-between items-center p-2 md:p-4 bg-gray-950/60 absolute w-full top-0 z-10 text-white font-mono uppercase tracking-widest text-xs font-bold pointer-events-none">
          <div className="flex items-center gap-4 pointer-events-auto">
            <a href="/dashboard/session" className="bg-gray-800 p-1.5 rounded hover:bg-gray-700 transition" title={t('manageAttendance')}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </a>
            <span className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full"><Clock className="w-4 h-4 text-blue-400" /> {elapsed}</span>
          </div>
          <div>{t('target')} {currentTarget}</div>
        </div>

        <ScorePanel
          teamLabel="a"
          score={optScoreA}
          onIncrement={() => handleScoreChange('a', 1)}
          onDecrement={(e) => handleScoreChange('a', -1, e)}
          onTouchStart={handleTouchStart}
          onTouchEnd={(e) => handleTouchEnd(e, 'a')}
        />

        {/* Divider */}
        <div className="h-full w-2 bg-gray-950 z-10" />

        <ScorePanel
          teamLabel="b"
          score={optScoreB}
          onIncrement={() => handleScoreChange('b', 1)}
          onDecrement={(e) => handleScoreChange('b', -1, e)}
          onTouchStart={handleTouchStart}
          onTouchEnd={(e) => handleTouchEnd(e, 'b')}
        />
      </div>

      {/* TEAM ROSTER SECTION (Only visible in Portrait mode) */}
      <div className="landscape:hidden flex flex-row w-full flex-1 bg-gray-900 overflow-y-auto">
        <RosterPanel
          team="a"
          players={sortedTeamA}
          positions={match.team_a_positions}
          isOpen={showTeamARoster}
          onToggle={() => setShowTeamARoster(prev => !prev)}
          onDecrementScore={(e) => handleScoreChange('a', -1, e)}
          onSub={(p) => setSubbingPlayer(p)}
          onSwap={(p) => setSwappingPlayer(p)}
        />
        <RosterPanel
          team="b"
          players={sortedTeamB}
          positions={match.team_b_positions}
          isOpen={showTeamBRoster}
          onToggle={() => setShowTeamBRoster(prev => !prev)}
          onDecrementScore={(e) => handleScoreChange('b', -1, e)}
          onSub={(p) => setSubbingPlayer(p)}
          onSwap={(p) => setSwappingPlayer(p)}
        />
      </div>

      <QueuePanel
        players={sortedQueuedPlayers}
        isOpen={showQueue}
        onToggle={() => setShowQueue(prev => !prev)}
      />

      <AdminControls
        isMatchOver={isMatchOver}
        isPending={isPending}
        onCancel={(e) => { e.stopPropagation(); if (confirm(t('cancelConfirm'))) startTransition(() => cancelMatch(match.id, session.id)) }}
        onSwapTeams={(e) => { e.stopPropagation(); startTransition(() => { swapTeams(match.id, session.id) }) }}
        onFinishEarly={(e) => { e.stopPropagation(); if (confirm(t('finishConfirm'))) startTransition(() => finishMatch(match.id, session.id)) }}
      />

      {subbingPlayer && (
        <SubstitutionModal
          subbingPlayer={subbingPlayer}
          benchedPlayers={benchedPlayers}
          isPending={isPending}
          onConfirm={handleSubstitute}
          onClose={() => setSubbingPlayer(null)}
        />
      )}

      {swappingPlayer && (
        <SwapPositionModal
          swappingPlayer={swappingPlayer}
          sortedTeamA={sortedTeamA}
          sortedTeamB={sortedTeamB}
          match={match}
          isPending={isPending}
          onConfirm={(targetId) => {
            startTransition(() => {
              swapPositions(match.id, session.id, swappingPlayer.id, targetId)
              setSwappingPlayer(null)
            })
          }}
          onClose={() => setSwappingPlayer(null)}
        />
      )}

      {isMatchOver && (
        <MatchOverModal
          scoreA={optScoreA}
          scoreB={optScoreB}
          isPending={isPending}
          onDraftNext={() => startTransition(() => finishMatch(match.id, session.id, 'draft'))}
          onBackToAttendance={() => startTransition(() => finishMatch(match.id, session.id, 'attendance'))}
          onUndoPoint={() => {
            startTransition(() => {
              if (optScoreA > optScoreB) handleScoreChange('a', -1)
              else if (optScoreB > optScoreA) handleScoreChange('b', -1)
            })
          }}
        />
      )}

      {/* Hoster Toast Notification */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-gray-800 text-white font-bold px-4 py-2 rounded-full shadow-lg border border-gray-700 animate-in fade-in slide-in-from-top-4 duration-300 z-50">
          {toastMessage}
        </div>
      )}
    </div>
  )
}
