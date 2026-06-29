'use client'

import { useTransition, useOptimistic, useRef } from 'react'
import { updateScore, finishMatch, cancelMatch } from './actions'
import { Minus } from 'lucide-react'

export default function Scoreboard({ session, match, players }: { session: any, match: any, players: any[] }) {
  const [isPending, startTransition] = useTransition()
  
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

  const isMatchOver = optScoreA >= session.target_score || optScoreB >= session.target_score

  const teamAPlayers = match.team_a_players.map((id: string) => players.find(p => p.id === id)).filter(Boolean)
  const teamBPlayers = match.team_b_players.map((id: string) => players.find(p => p.id === id)).filter(Boolean)

  return (
    <div className="flex flex-col h-screen bg-gray-900 overflow-hidden">
      
      {/* SCOREBOARD SECTION */}
      <div className="relative flex flex-row w-full landscape:h-screen portrait:h-[40vh] portrait:shrink-0">
        
        {/* Top Bar Overlay */}
        <div className="flex justify-between items-center p-2 md:p-4 bg-gray-950/60 absolute w-full top-0 z-10 text-white font-mono uppercase tracking-widest text-xs font-bold pointer-events-none">
          <div className="flex items-center gap-4 pointer-events-auto">
            <a href="/dashboard/session" className="bg-gray-800 p-1.5 rounded hover:bg-gray-700 transition" title="Manage Attendance">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </a>
            <span>Target: {session.target_score}</span>
          </div>
          <div className="pointer-events-auto">
            {isMatchOver && (
              <button 
                onClick={(e) => { e.stopPropagation(); startTransition(() => finishMatch(match.id, session.id)) }}
                className="bg-yellow-500 text-black px-4 py-1.5 rounded-full font-bold shadow-lg animate-pulse"
              >
                FINISH GAME
              </button>
            )}
          </div>
          <div>{session.tie_breaker_rule.replace(/_/g, ' ')}</div>
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
            className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/20 hover:bg-black/40 text-white p-3 rounded-full md:hidden landscape:flex"
            title="Decrease Score"
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
            className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/20 hover:bg-black/40 text-white p-3 rounded-full md:hidden landscape:flex"
            title="Decrease Score"
          >
            <Minus className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* TEAM ROSTER SECTION (Only visible in Portrait mode) */}
      <div className="landscape:hidden flex flex-row w-full flex-1 bg-gray-900 overflow-y-auto">
        
        {/* Team A Roster */}
        <div className="flex-1 p-4 border-r border-gray-800">
          <div className="flex justify-between items-center border-b border-red-900/50 pb-2 mb-3">
            <h3 className="text-red-500 font-black text-lg uppercase tracking-wide">Red Team</h3>
            <button onClick={(e) => handleScoreChange('a', -1, e)} className="bg-gray-800 text-gray-400 p-1 rounded-md hover:text-white">
              <Minus className="w-4 h-4" />
            </button>
          </div>
          <ul className="flex flex-col gap-2">
            {teamAPlayers.map((p: any) => (
              <li key={p.id} className="bg-gray-800 rounded-lg p-3 shadow">
                <div className="font-bold text-gray-100">{p.name}</div>
                <div className="text-xs text-gray-400 mt-1 flex flex-wrap gap-1">
                  {p.positions.length > 0 ? p.positions.map((pos: string) => (
                    <span key={pos} className="bg-gray-700 px-1 rounded">{pos}</span>
                  )) : 'Any'}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Team B Roster */}
        <div className="flex-1 p-4 pb-20">
          <div className="flex justify-between items-center border-b border-blue-900/50 pb-2 mb-3">
            <h3 className="text-blue-500 font-black text-lg uppercase tracking-wide">Blue Team</h3>
            <button onClick={(e) => handleScoreChange('b', -1, e)} className="bg-gray-800 text-gray-400 p-1 rounded-md hover:text-white">
              <Minus className="w-4 h-4" />
            </button>
          </div>
          <ul className="flex flex-col gap-2">
            {teamBPlayers.map((p: any) => (
              <li key={p.id} className="bg-gray-800 rounded-lg p-3 shadow">
                <div className="font-bold text-gray-100">{p.name}</div>
                <div className="text-xs text-gray-400 mt-1 flex flex-wrap gap-1">
                  {p.positions.length > 0 ? p.positions.map((pos: string) => (
                    <span key={pos} className="bg-gray-700 px-1 rounded">{pos}</span>
                  )) : 'Any'}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Admin Footer Controls */}
      <div className="absolute bottom-4 left-0 w-full flex justify-center gap-4 px-4 z-20 pointer-events-none">
        <div className="flex gap-4 pointer-events-auto">
          <button 
            onClick={(e) => { e.stopPropagation(); if (confirm('Cancel this game? No MMR will be updated and players will return to the queue.')) startTransition(() => cancelMatch(match.id, session.id)) }}
            className="bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-800/50 px-4 py-2 rounded-full font-bold text-sm shadow-lg backdrop-blur-sm transition-colors"
          >
            Cancel Game
          </button>
          
          {!isMatchOver && (
            <button 
              onClick={(e) => { e.stopPropagation(); if (confirm('Finish this game early? Stats will be recorded as is.')) startTransition(() => finishMatch(match.id, session.id)) }}
              className="bg-gray-900/80 hover:bg-gray-800 text-gray-300 border border-gray-700/50 px-4 py-2 rounded-full font-bold text-sm shadow-lg backdrop-blur-sm transition-colors"
            >
              Finish Early
            </button>
          )}
        </div>
      </div>

    </div>
  )
}
