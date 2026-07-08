import { Medal } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

type PlayerRankingsColumnProps = {
  rankedPlayers: { name: string; wins: number; matches: number }[]
}

export default async function PlayerRankingsColumn({ rankedPlayers }: PlayerRankingsColumnProps) {
  const t = await getTranslations('Dashboard')

  return (
    <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-2xl p-6 shadow">
      <h2 className="text-xl font-semibold mb-6 dark:text-gray-100 flex items-center gap-2 border-b dark:border-gray-800 pb-3">
        <Medal className="w-5 h-5 text-yellow-500" /> {t('leaderboard')}
      </h2>
      
      {rankedPlayers.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-center py-8 text-sm">{t('noMatchesYet')}</p>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {rankedPlayers.map((p, i) => (
              <li key={p.name} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border dark:border-gray-800">
                <div className="flex items-center gap-3">
                  <span className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${i === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400' : i === 1 ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300' : i === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400' : 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                    #{i + 1}
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{p.name}</span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-900 dark:text-gray-100">{t('wins', { count: p.wins })}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{t('matches', { count: p.matches })}</div>
                </div>
              </li>
            ))}
          </ul>
          <a href="/dashboard/leaderboard" className="block text-center mt-4 w-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-300 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition">
            {t('viewFullLeaderboard')}
          </a>
        </>
      )}
    </div>
  )
}
