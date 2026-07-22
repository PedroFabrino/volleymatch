'use client'

import { ChevronUp, ChevronDown } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { PlayerWithStatus } from '@/lib/matchmaking'

type QueuePanelProps = {
  players: PlayerWithStatus[]
  isOpen: boolean
  onToggle: () => void
}

export function QueuePanel({
  players,
  isOpen,
  onToggle
}: QueuePanelProps) {
  const t = useTranslations('Scoreboard')

  return (
    <div className="landscape:hidden bg-gray-900 px-4 py-3 border-t border-gray-800">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={onToggle}
            className="text-gray-400 hover:text-white transition"
            aria-label={isOpen ? t('collapse') : t('expand')}
          >
            {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          <h3 className="text-blue-400 font-bold text-sm uppercase tracking-wide">
            {t('nextUpQueue')}
          </h3>
        </div>
        <span className="text-xs text-gray-500 font-normal">{t('waitingCount', { count: players.length })}</span>
      </div>
      {isOpen && (
        <>
          {players.length === 0 ? (
            <p className="text-gray-500 text-xs">{t('noPlayersInQueue')}</p>
          ) : (
            <ul className="space-y-1">
              {players.map((p, index) => (
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
  )
}
