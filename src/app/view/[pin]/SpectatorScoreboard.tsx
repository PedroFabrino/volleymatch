'use client'

import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { PlayerWithStatus } from '@/utils/matchmaking'

export default function SpectatorScoreboard({ session, match, playersWithStatus }: { session: any, match: any, playersWithStatus: PlayerWithStatus[] }) {
  const t = useTranslations('Scoreboard')
  const posT = useTranslations('Positions')

  // Timer State
  const [elapsed, setElapsed] = useState('00:00')

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

  const optScoreA = match.team_a_score
  const optScoreB = match.team_b_score

  const isMatchOver = optScoreA >= session.target_score || optScoreB >= session.target_score

  const teamAPlayers = match.team_a_players.map((id: string) => playersWithStatus.find(p => p.id === id)).filter(Boolean)
  const teamBPlayers = match.team_b_players.map((id: string) => playersWithStatus.find(p => p.id === id)).filter(Boolean)

  const benchPlayers = playersWithStatus.filter(p => !match.team_a_players.includes(p.id) && !match.team_b_players.includes(p.id))

  const sortOrder = ['Setter', 'Middle Blocker', 'Outside Hitter', 'Opposite Hitter', 'Libero', 'Any'];
  const sortPlayersByPos = (teamPlayers: any[], positions?: Record<string, string>) => {
    return [...teamPlayers].sort((a, b) => {
      // Fallback to their primary position if drafted position is missing/Any
      const posA = (positions && positions[a.id] !== 'Any') ? positions[a.id] : (a.positions?.[0] || 'Any');
      const posB = (positions && positions[b.id] !== 'Any') ? positions[b.id] : (b.positions?.[0] || 'Any');
      const indexA = sortOrder.indexOf(posA);
      const indexB = sortOrder.indexOf(posB);
      return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
    });
  }

  return (
    <div className="flex flex-col h-[80vh] bg-gray-900 overflow-hidden relative rounded-3xl border border-gray-800 shadow-2xl">
      
      {/* SCOREBOARD SECTION */}
      <div className="relative flex flex-row w-full h-[40vh] shrink-0">
        
        {/* Top Bar Overlay */}
        <div className="flex justify-between items-center p-4 bg-gray-950/60 absolute w-full top-0 z-10 text-white font-mono uppercase tracking-widest text-xs font-bold pointer-events-none">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full"><Clock className="w-4 h-4 text-blue-400" /> {elapsed}</span>
          </div>
          <div>{t('target')} {session.target_score}</div>
        </div>

        {/* Team A (Red) */}
        <div className="relative flex-1 flex items-center justify-center bg-red-600">
          <div className="text-[20vh] font-black text-white leading-none pt-4">
            {optScoreA}
          </div>
        </div>

        {/* Divider */}
        <div className="h-full w-2 bg-gray-950 z-10" />

        {/* Team B (Blue) */}
        <div className="relative flex-1 flex items-center justify-center bg-blue-600">
          <div className="text-[20vh] font-black text-white leading-none pt-4">
            {optScoreB}
          </div>
        </div>
      </div>

      {/* TEAM ROSTER SECTION */}
      <div className="flex flex-row w-full flex-1 bg-gray-900 overflow-y-auto">
        
        {/* Team A Roster */}
        <div className="flex-1 p-4 border-r border-gray-800">
          <div className="flex justify-between items-center border-b border-red-900/50 pb-2 mb-3">
            <h3 className="text-red-500 font-black text-lg uppercase tracking-wide">{t('redTeam')}</h3>
          </div>
          <ul className="flex flex-col gap-2">
            {sortPlayersByPos(teamAPlayers, match.team_a_positions).map((p: any) => {
              const pos = match.team_a_positions?.[p.id];
              const displayPos = (pos && pos !== 'Any') ? pos : (p.positions?.[0] || 'Any');
              const isLibero = displayPos === 'Libero';
              return (
              <li key={p.id} className={`rounded-lg p-3 shadow flex flex-col justify-center ${isLibero ? 'bg-amber-900/30 border border-amber-500/30' : 'bg-gray-800'}`}>
                <div className={`font-bold ${isLibero ? 'text-amber-100' : 'text-gray-100'}`}>{p.name}</div>
                <div className="text-[10px] text-gray-400 mt-1 flex flex-wrap gap-1 font-bold">
                  {pos && pos !== 'Any' ? (
                    <span className={`px-2 py-0.5 rounded ${isLibero ? 'bg-amber-900/60 text-amber-200' : 'bg-red-900/50 text-red-200'}`}>{posT(pos as any)}</span>
                  ) : (
                    p.positions.length > 0 ? p.positions.map((ppos: string) => (
                      <span key={ppos} className={`px-1 rounded ${ppos === 'Libero' ? 'bg-amber-900/60 text-amber-200' : 'bg-gray-700'}`}>{posT(ppos as any)}</span>
                    )) : t('any')
                  )}
                </div>
              </li>
            )})}
          </ul>
        </div>

        {/* Team B Roster */}
        <div className="flex-1 p-4 pb-4">
          <div className="flex justify-between items-center border-b border-blue-900/50 pb-2 mb-3">
            <h3 className="text-blue-500 font-black text-lg uppercase tracking-wide">{t('blueTeam')}</h3>
          </div>
          <ul className="flex flex-col gap-2">
            {sortPlayersByPos(teamBPlayers, match.team_b_positions).map((p: any) => {
              const pos = match.team_b_positions?.[p.id];
              const displayPos = (pos && pos !== 'Any') ? pos : (p.positions?.[0] || 'Any');
              const isLibero = displayPos === 'Libero';
              return (
              <li key={p.id} className={`rounded-lg p-3 shadow flex flex-col justify-center ${isLibero ? 'bg-amber-900/30 border border-amber-500/30' : 'bg-gray-800'}`}>
                <div className={`font-bold ${isLibero ? 'text-amber-100' : 'text-gray-100'}`}>{p.name}</div>
                <div className="text-[10px] text-gray-400 mt-1 flex flex-wrap gap-1 font-bold">
                  {pos && pos !== 'Any' ? (
                    <span className={`px-2 py-0.5 rounded ${isLibero ? 'bg-amber-900/60 text-amber-200' : 'bg-blue-900/50 text-blue-200'}`}>{posT(pos as any)}</span>
                  ) : (
                    p.positions.length > 0 ? p.positions.map((ppos: string) => (
                      <span key={ppos} className={`px-1 rounded ${ppos === 'Libero' ? 'bg-amber-900/60 text-amber-200' : 'bg-gray-700'}`}>{posT(ppos as any)}</span>
                    )) : t('any')
                  )}
                </div>
              </li>
            )})}
          </ul>
        </div>
      </div>

      {/* Queue Section */}
      <div className="p-4 bg-gray-950 border-t border-gray-800 shrink-0">
        <h3 className="text-gray-400 font-bold text-sm uppercase tracking-wider mb-3">Up Next (Queue)</h3>
        <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-thin scrollbar-thumb-gray-800">
          {benchPlayers.map((p) => {
            let statusIcon = '🕐';
            let statusColor = 'border-gray-700 bg-gray-900 opacity-60';
            
            if (p.draftStatus === 'in_next_match') {
              statusIcon = '✅';
              statusColor = 'border-green-600 bg-green-900/30';
            } else if (p.draftStatus === 'position_conflict') {
              statusIcon = '⚠️';
              statusColor = 'border-amber-600/50 bg-amber-900/20 opacity-70';
            }

            return (
              <div key={p.id} className={`flex-shrink-0 rounded-lg px-3 py-2 flex flex-col min-w-[110px] border ${statusColor}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-sm">{statusIcon}</span>
                  <span className="font-bold text-gray-200 text-sm truncate">{p.name}</span>
                </div>
                <span className="text-[10px] text-gray-500 font-medium tracking-wider uppercase ml-6">
                  {p.games_played_today} games
                </span>
              </div>
            )
          })}
          {benchPlayers.length === 0 && (
            <div className="text-gray-500 text-sm italic">No players on the bench.</div>
          )}
        </div>
      </div>

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
            <p className="text-gray-400 text-center animate-pulse">Waiting for host to proceed...</p>
          </div>
        </div>
      )}

    </div>
  )
}
