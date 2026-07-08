import { getTranslations } from 'next-intl/server'
import { Player } from '@/types/player'

type QueuedPlayer = Player & { games_played_today: number }

type SessionQueuePanelProps = {
  queuedPlayers: QueuedPlayer[]
}

export default async function SessionQueuePanel({ queuedPlayers }: SessionQueuePanelProps) {
  const t = await getTranslations('Session')

  return (
    <div>
      <h3 className="text-lg font-bold mb-3 border-b dark:border-gray-800 pb-2 flex items-center justify-between dark:text-gray-100">
        {t('nextInQueue')}
        <span className="bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs px-2 py-1 rounded-full">{t('waiting', { count: queuedPlayers.length })}</span>
      </h3>
      
      {queuedPlayers.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">{t('emptyQueue')}</p>
      ) : (
        <ul className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2">
          {queuedPlayers.map((p, i) => (
            <li key={p.id} className="flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400 font-bold w-6 h-6 rounded-full flex items-center justify-center text-xs">
                  {i + 1}
                </div>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{p.name}</span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">{t('gamesPlayed', { count: Math.floor(p.games_played_today) })}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
