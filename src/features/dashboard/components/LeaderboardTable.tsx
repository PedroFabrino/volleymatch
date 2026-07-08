import { getTranslations } from 'next-intl/server'

type RankedPlayer = {
  name: string
  wins: number
  matches: number
  mmr: number
}

type LeaderboardTableProps = {
  rankedPlayers: RankedPlayer[]
}

function rankBadgeClass(index: number): string {
  if (index === 0) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400'
  if (index === 1) return 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
  if (index === 2) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400'
  return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
}

export default async function LeaderboardTable({ rankedPlayers }: LeaderboardTableProps) {
  const t = await getTranslations('Leaderboard')

  if (rankedPlayers.length === 0) {
    return <p className="text-gray-500 dark:text-gray-400 text-center py-12">{t('noPlayers')}</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b dark:border-gray-800 text-gray-500 dark:text-gray-400">
            <th className="p-3 font-semibold">{t('rank')}</th>
            <th className="p-3 font-semibold">{t('player')}</th>
            <th className="p-3 font-semibold text-center">{t('wins')}</th>
            <th className="p-3 font-semibold text-center">{t('matches')}</th>
            <th className="p-3 font-semibold text-center">{t('winRate')}</th>
            <th className="p-3 font-semibold text-right">{t('mmr')}</th>
          </tr>
        </thead>
        <tbody>
          {rankedPlayers.map((p, i) => {
            const winRate = p.matches > 0 ? Math.round((p.wins / p.matches) * 100) : 0
            return (
              <tr key={p.name} className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                <td className="p-3">
                  <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${rankBadgeClass(i)}`}>
                    #{i + 1}
                  </span>
                </td>
                <td className="p-3 font-semibold text-gray-900 dark:text-gray-100">{p.name}</td>
                <td className="p-3 text-center font-bold text-green-600 dark:text-green-400">{p.wins}</td>
                <td className="p-3 text-center text-gray-600 dark:text-gray-400">{p.matches}</td>
                <td className="p-3 text-center text-gray-600 dark:text-gray-400">{winRate}%</td>
                <td className="p-3 text-right font-mono text-gray-500 dark:text-gray-500">{p.mmr}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
