'use client'

import { ChevronUp, ChevronDown, Minus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { PlayerRosterRow } from '@/components'

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
          {players.map((p) => (
            <PlayerRosterRow
              key={p.id}
              player={p}
              position={positions?.[p.id]}
              team={team}
              onSub={onSub}
              onSwap={onSwap}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
