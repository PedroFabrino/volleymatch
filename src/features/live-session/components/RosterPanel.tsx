'use client'

import { ChevronUp, ChevronDown, Minus } from 'lucide-react'
import { useTranslations } from 'next-intl'

type RosterPanelProps = {
  team: 'a' | 'b'
  players: any[]
  positions: Record<string, string> | undefined
  isOpen: boolean
  onToggle: () => void
  onDecrementScore: (e: React.MouseEvent) => void
  onSub: (player: { id: string; name: string; team: 'a' | 'b' }) => void
  onSwap: (player: { id: string; name: string; team: 'a' | 'b'; position: string }) => void
}

export function RosterPanel({
  team,
  players,
  positions,
  isOpen,
  onToggle,
  onDecrementScore,
  onSub,
  onSwap,
}: RosterPanelProps) {
  const t = useTranslations('Scoreboard')
  const posT = useTranslations('Positions')

  const isTeamA = team === 'a'
  const borderClass = isTeamA ? 'border-red-900/50' : 'border-blue-900/50'
  const titleClass = isTeamA ? 'text-red-500' : 'text-blue-500'
  const containerClass = `flex-1 p-4 ${isTeamA ? 'border-r border-gray-800' : 'pb-20'}`
  const teamName = isTeamA ? t('redTeam') : t('blueTeam')

  return (
    <div className={containerClass}>
      <div className={`flex justify-between items-center border-b ${borderClass} pb-2 mb-3`}>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggle}
            className="text-gray-400 hover:text-white transition"
            aria-label={isOpen ? t('collapse') : t('expand')}
          >
            {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          <h3 className={`${titleClass} font-black text-lg uppercase tracking-wide`}>{teamName}</h3>
        </div>
        <button onClick={onDecrementScore} className="bg-gray-800 text-gray-400 p-1 rounded-md hover:text-white">
          <Minus className="w-4 h-4" />
        </button>
      </div>
      {isOpen && (
        <ul className="flex flex-col gap-2">
          {players.map((p) => {
            const pos = positions?.[p.id];
            const displayPos = (pos && pos !== 'Any') ? pos : (p.positions?.[0] || 'Any');
            const isLibero = displayPos === 'Libero';
            return (
              <li key={p.id} className={`${isLibero ? 'bg-amber-900/30 border border-amber-500/30' : 'bg-gray-800'} rounded-lg p-3 shadow flex justify-between items-center`}>
                <div>
                  <div className={`font-bold ${isLibero ? 'text-amber-100' : 'text-gray-100'}`}>{p.name}</div>
                  <div className="text-[10px] text-gray-400 mt-1 flex flex-wrap gap-1 font-bold">
                    {pos && pos !== 'Any' ? (
                      <span className={`${isLibero ? 'bg-amber-900/60 text-amber-200' : isTeamA ? 'bg-red-900/50 text-red-200' : 'bg-blue-900/50 text-blue-200'} px-2 py-0.5 rounded`}>{posT(pos as any)}</span>
                    ) : (
                      p.positions && p.positions.length > 0 ? p.positions.map((ppos: string) => (
                        <span key={ppos} className={`${ppos === 'Libero' ? 'bg-amber-900/60 text-amber-200' : 'bg-gray-700'} px-1 rounded`}>{posT(ppos as any)}</span>
                      )) : t('any')
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => onSub({ id: p.id, name: p.name, team })}
                    className="bg-gray-700 text-xs px-2 py-1 rounded text-gray-300 hover:bg-gray-600 transition"
                  >
                    {t('sub')}
                  </button>
                  <button
                    onClick={() => onSwap({ id: p.id, name: p.name, team, position: displayPos })}
                    className="bg-gray-700 text-xs px-2 py-1 rounded text-gray-300 hover:bg-gray-600 transition ml-1"
                  >
                    {t('swap')}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
