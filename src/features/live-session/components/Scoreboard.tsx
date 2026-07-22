'use client'

import { useTranslations } from 'next-intl'
import { Clock } from 'lucide-react'
import type { PlayerWithStatus } from '@/lib/matchmaking'
import type { Session, Match, Player } from '@/types'
import { finishMatch } from '../actions'
import { useScoreboard } from '../hooks'
import { ScorePanel, RosterPanel, QueuePanel } from './ScoreboardPanels'
import { AdminControls } from './AdminControls'
import { SubstitutionModal, SwapPositionModal, MatchOverModal } from './ScoreboardModals'

export default function Scoreboard({ session, match, players, playersWithStatus, isHost }: { 
  session: Session, 
  match: Match, 
  players: Player[],
  playersWithStatus: PlayerWithStatus[],
  isHost: boolean
}) {
  const t = useTranslations('Scoreboard')
  
  const {
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
  } = useScoreboard(session, match, players, playersWithStatus, isHost)

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
          isHost={isHost}
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
          isHost={isHost}
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
          isHost={isHost}
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
          isHost={isHost}
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
        onCancel={(e) => { e.stopPropagation(); if (confirm(t('cancelConfirm'))) handleCancelMatch() }}
        onSwapTeams={(e) => { e.stopPropagation(); handleSwapTeams() }}
        onFinishEarly={(e) => { e.stopPropagation(); if (confirm(t('finishConfirm'))) handleFinishEarly() }}
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
          onConfirm={handleSwapPositions}
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
            if (!isHost) return;
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
