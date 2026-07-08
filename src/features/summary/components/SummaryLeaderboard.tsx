import { getTranslations } from 'next-intl/server'
import { PlayerStat } from '@/types/player'

type SummaryLeaderboardProps = {
  leaderboard: PlayerStat[]
  mvp?: { id: string } | null
  bestPartnerId?: string | null
  biggestComebackMatch?: {
    team_a_score: number
    team_b_score: number
    team_a_players: string[]
    team_b_players: string[]
  } | null
  maxComeback: number
  biggestDiffMatch?: {
    team_a_score: number
    team_b_score: number
    team_a_players: string[]
    team_b_players: string[]
  } | null
  maxDiff: number
  mostGamesPlayed?: { id: string } | null
}

export default async function SummaryLeaderboard({
  leaderboard,
  mvp,
  bestPartnerId,
  biggestComebackMatch,
  maxComeback,
  biggestDiffMatch,
  maxDiff,
  mostGamesPlayed,
}: SummaryLeaderboardProps) {
  const t = await getTranslations('Summary')

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border dark:border-gray-800 overflow-hidden">
      <div className="p-6 border-b dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
        <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100">{t('leaderboard')}</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">{t('leaderboardDesc')}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-800/50">
              <th className="p-4 font-bold text-gray-600 dark:text-gray-300">#</th>
              <th className="p-4 font-bold text-gray-600 dark:text-gray-300">{t('player')}</th>
              <th className="p-4 font-bold text-gray-600 dark:text-gray-300">{t('gamesPlayed')}</th>
              <th className="p-4 font-bold text-gray-600 dark:text-gray-300">{t('winRate')}</th>
              <th className="p-4 font-bold text-gray-600 dark:text-gray-300 text-right">{t('mmrChange')}</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((player, index) => (
              <tr key={player.id} className="border-t dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition">
                <td className="p-4 font-bold text-gray-500 dark:text-gray-400">{index + 1}</td>
                <td className="p-4 font-bold text-gray-900 dark:text-gray-100">
                  <div className="flex items-center flex-wrap gap-2">
                    <span>{player.name}</span>
                    {player.id === mvp?.id && (
                      <span className="inline-block px-2 py-0.5 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 text-xs rounded-md uppercase tracking-wider font-bold">{t('mvp')}</span>
                    )}
                    {player.id === bestPartnerId && (
                      <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs rounded-md uppercase tracking-wider font-bold">{t('dynamicDuo')}</span>
                    )}
                    {biggestComebackMatch && maxComeback > 0 && (biggestComebackMatch.team_a_score > biggestComebackMatch.team_b_score ? biggestComebackMatch.team_a_players : biggestComebackMatch.team_b_players).includes(player.id) && (
                      <span className="inline-block px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs rounded-md uppercase tracking-wider font-bold">{t('comebackKids')}</span>
                    )}
                    {biggestDiffMatch && maxDiff > 0 && (biggestDiffMatch.team_a_score > biggestDiffMatch.team_b_score ? biggestDiffMatch.team_a_players : biggestDiffMatch.team_b_players).includes(player.id) && (
                      <span className="inline-block px-2 py-0.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 text-xs rounded-md uppercase tracking-wider font-bold">{t('unstoppables')}</span>
                    )}
                    {player.id === mostGamesPlayed?.id && (
                      <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs rounded-md uppercase tracking-wider font-bold">{t('ironman')}</span>
                    )}
                  </div>
                </td>
                <td className="p-4 text-gray-700 dark:text-gray-300">{player.games_played}</td>
                <td className="p-4 text-gray-700 dark:text-gray-300">{player.winRate}%</td>
                <td className={`p-4 font-black text-right ${
                  player.mmrChange > 0 ? 'text-green-600 dark:text-green-400' :
                  player.mmrChange < 0 ? 'text-red-600 dark:text-red-400' :
                  'text-gray-500'
                }`}>
                  {player.mmrChange > 0 ? '+' : ''}{player.mmrChange}
                </td>
              </tr>
            ))}
            {leaderboard.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500 dark:text-gray-400">
                  {t('noPlayers')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
