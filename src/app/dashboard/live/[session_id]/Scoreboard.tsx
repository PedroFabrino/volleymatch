'use client'

import { useTransition, useOptimistic, useRef, useEffect, useState } from 'react'
import { updateScore, finishMatch, cancelMatch, substitutePlayer, swapPositions } from './actions'
import { Minus, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { PlayerWithStatus } from '@/utils/matchmaking'

export default function Scoreboard({ session, match, players, playersWithStatus }: { 
  session: any, 
  match: any, 
  players: any[],
  playersWithStatus: PlayerWithStatus[]
}) {
  const [isPending, startTransition] = useTransition()
  const t = useTranslations('Scoreboard')
  const posT = useTranslations('Positions')
  
  // Timer State
  const [elapsed, setElapsed] = useState('00:00')
  const [subbingPlayer, setSubbingPlayer] = useState<{ id: string, name: string, team: 'a' | 'b' } | null>(null)
  const [swappingPlayer, setSwappingPlayer] = useState<{ id: string, name: string, team: 'a' | 'b', position: string } | null>(null)

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

    // Only handle swipe down for decrease. Taps are handled by standard onClick.
    if (diff > 50) {
      handleScoreChange(team, -1)
    }
    touchStartY.current = null
  }

  const handleSubstitute = async (playerInId: string) => {
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

  // Up Next Queue – waiting players sorted by fewest games played first
  const playingIds = new Set([...match.team_a_players, ...match.team_b_players]);
  const queuedPlayers = playersWithStatus.filter(p => !playingIds.has(p.id));

  // Sort queue: players selected for next match first, then the rest
  const sortedQueuedPlayers = [...queuedPlayers].sort((a, b) => {
    if (a.draftStatus === 'in_next_match' && b.draftStatus !== 'in_next_match') return -1;
    if (a.draftStatus !== 'in_next_match' && b.draftStatus === 'in_next_match') return 1;
    return 0; // preserve original order within each group
  });

  const sortOrder = ['Setter', 'Middle Blocker', 'Outside Hitter', 'Opposite Hitter', 'Libero', 'Any'];
  const sortPlayersByPos = (teamPlayers: any[], positions?: Record<string, string>) => {
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

        {/* Team A (Red) */}
        <div 
          className="relative flex-1 flex items-center justify-center bg-red-600 active:bg-red-700 transition-colors cursor-pointer select-none touch-none"
          onTouchStart={handleTouchStart}
          onTouchEnd={(e) => handleTouchEnd(e, 'a')}
          onClick={() => handleScoreChange('a', 1)}
        >
          <div className="landscape:text-[40vh] portrait:text-[20vh] font-black text-white leading-none pt-4">
            {optScoreA}
          </div>
          <button 
            onClick={(e) => handleScoreChange('a', -1, e)}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/20 hover:bg-black/40 text-white p-3 rounded-full md:hidden landscape:flex z-20 pointer-events-auto"
            title={t('decreaseScore')}
          >
            <Minus className="w-6 h-6" />
          </button>
        </div>

        {/* Divider */}
        <div className="h-full w-2 bg-gray-950 z-10" />

        {/* Team B (Blue) */}
        <div 
          className="relative flex-1 flex items-center justify-center bg-blue-600 active:bg-blue-700 transition-colors cursor-pointer select-none touch-none"
          onTouchStart={handleTouchStart}
          onTouchEnd={(e) => handleTouchEnd(e, 'b')}
          onClick={() => handleScoreChange('b', 1)}
        >
          <div className="landscape:text-[40vh] portrait:text-[20vh] font-black text-white leading-none pt-4">
            {optScoreB}
          </div>
          <button 
            onClick={(e) => handleScoreChange('b', -1, e)}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/20 hover:bg-black/40 text-white p-3 rounded-full md:hidden landscape:flex z-20 pointer-events-auto"
            title={t('decreaseScore')}
          >
            <Minus className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* TEAM ROSTER SECTION (Only visible in Portrait mode) */}
      <div className="landscape:hidden flex flex-row w-full flex-1 bg-gray-900 overflow-y-auto">
        
        {/* Team A Roster Accordion */}
        <div className="flex-1 p-4 border-r border-gray-800">
          <div className="flex justify-between items-center border-b border-red-900/50 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowTeamARoster(prev => !prev)}
                className="text-gray-400 hover:text-white transition"
                aria-label={showTeamARoster ? t('collapse') : t('expand')}
              >
                {showTeamARoster ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
              <h3 className="text-red-500 font-black text-lg uppercase tracking-wide">{t('redTeam')}</h3>
            </div>
            <button onClick={(e) => handleScoreChange('a', -1, e)} className="bg-gray-800 text-gray-400 p-1 rounded-md hover:text-white">
              <Minus className="w-4 h-4" />
            </button>
          </div>
          {showTeamARoster && (
            <ul className="flex flex-col gap-2">
              {sortedTeamA.map((p: any) => {
                const pos = match.team_a_positions?.[p.id];
                const displayPos = (pos && pos !== 'Any') ? pos : (p.positions?.[0] || 'Any');
                const isLibero = displayPos === 'Libero';
                return (
                <li key={p.id} className={`${isLibero ? 'bg-amber-900/30 border border-amber-500/30' : 'bg-gray-800'} rounded-lg p-3 shadow flex justify-between items-center`}>
                  <div>
                    <div className={`font-bold ${isLibero ? 'text-amber-100' : 'text-gray-100'}`}>{p.name}</div>
                    <div className="text-[10px] text-gray-400 mt-1 flex flex-wrap gap-1 font-bold">
                      {pos && pos !== 'Any' ? (
                        <span className={`${isLibero ? 'bg-amber-900/60 text-amber-200' : 'bg-red-900/50 text-red-200'} px-2 py-0.5 rounded`}>{posT(pos as any)}</span>
                      ) : (
                        p.positions.length > 0 ? p.positions.map((ppos: string) => (
                          <span key={ppos} className={`${ppos === 'Libero' ? 'bg-amber-900/60 text-amber-200' : 'bg-gray-700'} px-1 rounded`}>{posT(ppos as any)}</span>
                        )) : t('any')
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => setSubbingPlayer({ id: p.id, name: p.name, team: 'a' })}
                      className="bg-gray-700 text-xs px-2 py-1 rounded text-gray-300 hover:bg-gray-600 transition"
                    >
                      {t('sub')}
                    </button>
                    <button
                      onClick={() => setSwappingPlayer({ id: p.id, name: p.name, team: 'a', position: displayPos })}
                      className="bg-gray-700 text-xs px-2 py-1 rounded text-gray-300 hover:bg-gray-600 transition ml-1"
                    >
                      {t('swap')}
                    </button>
                  </div>
                </li>
              )})}
            </ul>
          )}
        </div>

        {/* Team B Roster Accordion */}
        <div className="flex-1 p-4 pb-20">
          <div className="flex justify-between items-center border-b border-blue-900/50 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowTeamBRoster(prev => !prev)}
                className="text-gray-400 hover:text-white transition"
                aria-label={showTeamBRoster ? t('collapse') : t('expand')}
              >
                {showTeamBRoster ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
              <h3 className="text-blue-500 font-black text-lg uppercase tracking-wide">{t('blueTeam')}</h3>
            </div>
            <button onClick={(e) => handleScoreChange('b', -1, e)} className="bg-gray-800 text-gray-400 p-1 rounded-md hover:text-white">
              <Minus className="w-4 h-4" />
            </button>
          </div>
          {showTeamBRoster && (
            <ul className="flex flex-col gap-2">
              {sortedTeamB.map((p: any) => {
                const pos = match.team_b_positions?.[p.id];
                const displayPos = (pos && pos !== 'Any') ? pos : (p.positions?.[0] || 'Any');
                const isLibero = displayPos === 'Libero';
                return (
                <li key={p.id} className={`${isLibero ? 'bg-amber-900/30 border border-amber-500/30' : 'bg-gray-800'} rounded-lg p-3 shadow flex justify-between items-center`}>
                  <div>
                    <div className={`font-bold ${isLibero ? 'text-amber-100' : 'text-gray-100'}`}>{p.name}</div>
                    <div className="text-[10px] text-gray-400 mt-1 flex flex-wrap gap-1 font-bold">
                      {pos && pos !== 'Any' ? (
                        <span className={`${isLibero ? 'bg-amber-900/60 text-amber-200' : 'bg-blue-900/50 text-blue-200'} px-2 py-0.5 rounded`}>{posT(pos as any)}</span>
                      ) : (
                        p.positions.length > 0 ? p.positions.map((ppos: string) => (
                          <span key={ppos} className={`${ppos === 'Libero' ? 'bg-amber-900/60 text-amber-200' : 'bg-gray-700'} px-1 rounded`}>{posT(ppos as any)}</span>
                        )) : t('any')
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => setSubbingPlayer({ id: p.id, name: p.name, team: 'b' })}
                      className="bg-gray-700 text-xs px-2 py-1 rounded text-gray-300 hover:bg-gray-600 transition"
                    >
                      {t('sub')}
                    </button>
                    <button
                      onClick={() => setSwappingPlayer({ id: p.id, name: p.name, team: 'b', position: displayPos })}
                      className="bg-gray-700 text-xs px-2 py-1 rounded text-gray-300 hover:bg-gray-600 transition ml-1"
                    >
                      {t('swap')}
                    </button>
                  </div>
                </li>
              )})}
            </ul>
          )}
        </div>
      </div>

      {/* QUEUE SECTION (Next Up, visible in portrait) */}
      <div className="landscape:hidden bg-gray-900 px-4 py-3 border-t border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowQueue(prev => !prev)}
              className="text-gray-400 hover:text-white transition"
              aria-label={showQueue ? t('collapse') : t('expand')}
            >
              {showQueue ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            <h3 className="text-blue-400 font-bold text-sm uppercase tracking-wide">
              {t('nextUpQueue')}
            </h3>
          </div>
          <span className="text-xs text-gray-500 font-normal">{t('waitingCount', { count: sortedQueuedPlayers.length })}</span>
        </div>
        {showQueue && (
          <>
            {sortedQueuedPlayers.length === 0 ? (
              <p className="text-gray-500 text-xs">{t('noPlayersInQueue')}</p>
            ) : (
              <ul className="space-y-1 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800">
                {sortedQueuedPlayers.map((p, index) => (
                  <li key={p.id} className="flex items-center justify-between text-sm bg-gray-800 rounded px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-xs w-4">{index + 1}</span>
                      <span className={`font-semibold ${p.draftStatus === 'in_next_match' ? 'text-green-300' : 'text-gray-400'}`}>
                        {p.name}
                      </span>
                      {p.draftStatus === 'in_next_match' && (
                        <span className="text-[10px] bg-green-900/50 text-green-400 border border-green-700/40 px-1.5 py-0.5 rounded-full font-bold">
                          {t('playingNext')}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">{t('gamesPlayedLabel', { count: p.games_played_today ?? 0 })}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      {/* Admin Footer Controls */}
      <div className="absolute bottom-4 left-0 w-full flex justify-center gap-4 px-4 z-20 pointer-events-none">
        <div className="flex gap-4 pointer-events-auto">
          <button 
            onClick={(e) => { e.stopPropagation(); if (confirm(t('cancelConfirm'))) startTransition(() => cancelMatch(match.id, session.id)) }}
            className="bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-800/50 px-4 py-2 rounded-full font-bold text-sm shadow-lg backdrop-blur-sm transition-colors"
          >
            {t('cancelGame')}
          </button>
          
          {!isMatchOver && (
            <button 
              onClick={(e) => { e.stopPropagation(); if (confirm(t('finishConfirm'))) startTransition(() => finishMatch(match.id, session.id)) }}
              className="bg-gray-900/80 hover:bg-gray-800 text-gray-300 border border-gray-700/50 px-4 py-2 rounded-full font-bold text-sm shadow-lg backdrop-blur-sm transition-colors"
            >
              {t('finishEarly')}
            </button>
          )}
        </div>
      </div>

      {/* Substitution Modal */}
      {subbingPlayer && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-gray-800">
              <h3 className="text-xl font-bold text-white text-center">{t('subOut', { name: subbingPlayer.name })}</h3>
              <p className="text-sm text-gray-400 text-center mt-1">{t('subSelect')}</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
              {benchedPlayers.length === 0 ? (
                <p className="text-gray-500 text-center py-8">{t('noBench')}</p>
              ) : (
                benchedPlayers.map(p => (
                  <button 
                    key={p.id}
                    onClick={() => handleSubstitute(p.id)}
                    disabled={isPending}
                    className="flex justify-between items-center bg-gray-800 p-4 rounded-xl hover:bg-gray-700 transition disabled:opacity-50 w-full text-left"
                  >
                    <span className="font-bold text-white">{p.name}</span>
                    <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">{t('subIn')}</span>
                  </button>
                ))
              )}
            </div>

            <div className="p-4 border-t border-gray-800">
              <button 
                onClick={() => setSubbingPlayer(null)}
                className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-xl transition"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Swap Position Modal */}
      {swappingPlayer && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-gray-800">
              <h3 className="text-xl font-bold text-white text-center">{t('swapPosition', { name: swappingPlayer.name })}</h3>
              <p className="text-sm text-gray-400 text-center mt-1">{t('swapSelect')}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
              {[...sortedTeamA, ...sortedTeamB]
                .filter(p => p.id !== swappingPlayer.id)
                .map(p => {
                  const isTeamA = match.team_a_players.includes(p.id)
                  const pos = isTeamA ? match.team_a_positions?.[p.id] : match.team_b_positions?.[p.id]
                  const displayPos = (pos && pos !== 'Any') ? pos : (p.positions?.[0] || 'Any')
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        startTransition(() => {
                          swapPositions(match.id, session.id, swappingPlayer.id, p.id)
                          setSwappingPlayer(null)
                        })
                      }}
                      disabled={isPending}
                      className="flex justify-between items-center bg-gray-800 p-4 rounded-xl hover:bg-gray-700 transition disabled:opacity-50 w-full text-left"
                    >
                      <span className="font-bold text-white">{p.name}</span>
                      <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">{displayPos}</span>
                    </button>
                  )
                })}
            </div>
            <div className="p-4 border-t border-gray-800">
              <button
                onClick={() => setSwappingPlayer(null)}
                className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-xl transition"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Match Over Modal */}
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

            <div className="flex flex-col gap-3 w-full">
              <button 
                onClick={() => { startTransition(() => finishMatch(match.id, session.id, 'draft')) }}
                disabled={isPending}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition shadow-lg disabled:opacity-50"
              >
                {t('draftNext')}
              </button>
              <button 
                onClick={() => { startTransition(() => finishMatch(match.id, session.id, 'attendance')) }}
                disabled={isPending}
                className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold py-4 rounded-xl transition disabled:opacity-50"
              >
                {t('backToAttendance')}
              </button>
              
              <div className="mt-4 pt-4 border-t border-gray-800 w-full">
                <button 
                  onClick={() => {
                    // Let them hide the modal if they want to undo a point
                    startTransition(() => {
                      if (optScoreA > optScoreB) handleScoreChange('a', -1)
                      else if (optScoreB > optScoreA) handleScoreChange('b', -1)
                    })
                  }}
                  disabled={isPending}
                  className="w-full bg-transparent text-gray-500 hover:text-gray-300 font-bold py-2 transition disabled:opacity-50"
                >
                  {t('undoPoint')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
