import { History } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

type Match = {
  id: string
  created_at: string
  team_a_score: number
  team_b_score: number
  team_a_players: string[]
  team_b_players: string[]
}

type RecentMatchesColumnProps = {
  latestMatches: Match[]
  playerStats: Record<string, { name: string }>
}

export default async function RecentMatchesColumn({ latestMatches, playerStats }: RecentMatchesColumnProps) {
  const t = await getTranslations('Dashboard')

  const getPlayerName = (id: string) => playerStats[id]?.name || 'Unknown'

  return (
    <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-2xl p-6 shadow flex flex-col">
      <h2 className="text-xl font-semibold mb-6 dark:text-gray-100 flex items-center gap-2 border-b dark:border-gray-800 pb-3">
        <History className="w-5 h-5 text-gray-400" /> {t('recentMatches')}
      </h2>

      <div className="flex flex-col gap-4">
        {latestMatches.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8 text-sm">{t('noMatchHistory')}</p>
        ) : (
          <>
            {latestMatches.map(match => (
              <div key={match.id} className="bg-gray-50 dark:bg-gray-800/50 border dark:border-gray-800 rounded-xl p-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {new Date(match.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                  <div className="flex items-center gap-2 font-black text-lg">
                    <span className={`${match.team_a_score > match.team_b_score ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}`}>{match.team_a_score}</span>
                    <span className="text-gray-300 dark:text-gray-600">-</span>
                    <span className={`${match.team_b_score > match.team_a_score ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>{match.team_b_score}</span>
                  </div>
                </div>
                <div className="flex gap-4 text-xs">
                  <div className="flex-1">
                    <div className="font-bold text-red-500/80 mb-1">Red Team</div>
                    <div className="text-gray-600 dark:text-gray-400 leading-tight">
                      {match.team_a_players.map((id: string) => getPlayerName(id)).join(', ')}
                    </div>
                  </div>
                  <div className="flex-1 text-right">
                    <div className="font-bold text-blue-500/80 mb-1">Blue Team</div>
                    <div className="text-gray-600 dark:text-gray-400 leading-tight">
                      {match.team_b_players.map((id: string) => getPlayerName(id)).join(', ')}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <a href="/dashboard/history" className="block text-center mt-2 w-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-300 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition">
              {t('viewAllMatches')}
            </a>
          </>
        )}
      </div>
    </div>
  )
}
