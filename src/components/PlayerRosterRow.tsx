'use client'

import { useTranslations } from 'next-intl'
import { Player, PlayerPosition } from '@/types/player'

type PlayerRosterRowProps = {
  player: Player | { id: string; name: string; positions?: string[] }
  position: string | undefined
  team: 'a' | 'b'
  isSpectatorMode?: boolean
  onSub?: (player: { id: string; name: string; team: 'a' | 'b' }) => void
  onSwap?: (player: { id: string; name: string; team: 'a' | 'b'; position: string }) => void
}

export function PlayerRosterRow({
  player,
  position,
  team,
  isSpectatorMode = false,
  onSub,
  onSwap,
}: PlayerRosterRowProps) {
  const t = useTranslations('Scoreboard')
  const posT = useTranslations('Positions')

  const isTeamA = team === 'a'
  const displayPos = (position && position !== 'Any') ? position : (player.positions?.[0] || 'Any')
  const isLibero = displayPos === 'Libero'

  const baseContainerClass = `${isLibero ? 'bg-amber-900/30 border border-amber-500/30' : 'bg-gray-800'} rounded-lg p-3 shadow flex`
  const containerClass = isSpectatorMode 
    ? `${baseContainerClass} flex-col justify-center` 
    : `${baseContainerClass} justify-between items-center`

  return (
    <li className={containerClass}>
      <div>
        <div className={`font-bold ${isLibero ? 'text-amber-100' : 'text-gray-100'}`}>{player.name}</div>
        <div className="text-[10px] text-gray-400 mt-1 flex flex-wrap gap-1 font-bold">
          {position && position !== 'Any' ? (
            <span className={`${isLibero ? 'bg-amber-900/60 text-amber-200' : isTeamA ? 'bg-red-900/50 text-red-200' : 'bg-blue-900/50 text-blue-200'} px-2 py-0.5 rounded`}>
              {posT(position as PlayerPosition)}
            </span>
          ) : (
            player.positions && player.positions.length > 0 ? player.positions.map((ppos: string) => (
              <span key={ppos} className={`${ppos === 'Libero' ? 'bg-amber-900/60 text-amber-200' : 'bg-gray-700'} px-1 rounded`}>
                {posT(ppos as PlayerPosition)}
              </span>
            )) : t('any')
          )}
        </div>
      </div>
      {!isSpectatorMode && onSub && onSwap && (
        <div className="flex items-center gap-1 mt-2 sm:mt-0">
          <button 
            onClick={() => onSub({ id: player.id, name: player.name, team })}
            className="bg-gray-700 text-xs px-2 py-1 rounded text-gray-300 hover:bg-gray-600 transition"
          >
            {t('sub')}
          </button>
          <button
            onClick={() => onSwap({ id: player.id, name: player.name, team, position: displayPos })}
            className="bg-gray-700 text-xs px-2 py-1 rounded text-gray-300 hover:bg-gray-600 transition ml-1"
          >
            {t('swap')}
          </button>
        </div>
      )}
    </li>
  )
}
