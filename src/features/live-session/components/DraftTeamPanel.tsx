'use client'

import { useTranslations } from 'next-intl'
import type { Player } from '@/types/player'
import { sortTeamIdsByPos } from '@/utils/sortPlayersByPos'

type DraftTeamPanelProps = {
  teamIds: string[]
  positions?: Record<string, string>
  players: Player[]
  teamColor: 'red' | 'blue'
  averageMmr: number
}

const TEAM_STYLES = {
  red: {
    container: 'flex-1 bg-red-900/20 border border-red-500/30 rounded-2xl p-6',
    header: 'text-red-400 font-bold text-xl mb-4 border-b border-red-500/30 pb-2 flex justify-between items-end',
    mmr: 'text-xs font-bold text-red-500/70 tracking-wider',
    badge: 'bg-red-900/50 text-red-200',
  },
  blue: {
    container: 'flex-1 bg-blue-900/20 border border-blue-500/30 rounded-2xl p-6',
    header: 'text-blue-400 font-bold text-xl mb-4 border-b border-blue-500/30 pb-2 flex justify-between items-end',
    mmr: 'text-xs font-bold text-blue-500/70 tracking-wider',
    badge: 'bg-blue-900/50 text-blue-200',
  },
} as const

export function DraftTeamPanel({
  teamIds,
  positions,
  players,
  teamColor,
  averageMmr,
}: DraftTeamPanelProps) {
  const t = useTranslations('Matchmaker')
  const tPos = useTranslations('Positions')
  const tCommon = useTranslations('Common')
  const styles = TEAM_STYLES[teamColor]

  const getPlayerName = (id: string) =>
    players.find(p => p.id === id)?.name || tCommon('unknownPlayer')

  const teamLabel = teamColor === 'red' ? t('redTeam') : t('blueTeam')
  const sortedIds = sortTeamIdsByPos(teamIds, players, positions)

  return (
    <div className={styles.container}>
      <h3 className={styles.header}>
        <span>{teamLabel}</span>
        <span className={styles.mmr}>MMR: {averageMmr}</span>
      </h3>
      <ul className="flex flex-col gap-2">
        {sortedIds.map(id => {
          const pos = positions?.[id]
          const player = players.find(p => p.id === id)
          const displayPos = (pos && pos !== 'Any') ? pos : (player?.positions?.[0] || 'Any')
          const isLibero = displayPos === 'Libero'

          return (
            <li
              key={id}
              className={`p-3 rounded-lg font-semibold flex justify-between items-center ${
                isLibero
                  ? 'bg-amber-900/30 border border-amber-500/30 text-amber-100'
                  : 'bg-gray-800/80 text-gray-100'
              }`}
            >
              <span>{getPlayerName(id)}</span>
              {displayPos !== 'Any' && (
                <span
                  className={`font-bold text-xs px-2 py-1 rounded ${
                    isLibero ? 'bg-amber-900/60 text-amber-200' : styles.badge
                  }`}
                >
                  {tPos(displayPos)}
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
