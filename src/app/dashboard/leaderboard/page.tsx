import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { Medal, ArrowLeft } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export default async function LeaderboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const t = await getTranslations('Leaderboard')

  if (!user) redirect('/login')

  const { data: players } = await supabase
    .from('players')
    .select('id, name, mmr')
    .eq('hoster_id', user.id)

  const { data: completedMatches } = await supabase
    .from('matches')
    .select('*')
    .eq('hoster_id', user.id)
    .eq('is_completed', true)

  const playerStats: Record<string, { matches: number; wins: number; name: string, mmr: number }> = {}
  
  if (players) {
    players.forEach(p => {
      playerStats[p.id] = { matches: 0, wins: 0, name: p.name, mmr: p.mmr }
    })
  }

  if (completedMatches) {
    completedMatches.forEach(match => {
      const teamAWon = match.team_a_score > match.team_b_score
      const teamBWon = match.team_b_score > match.team_a_score

      match.team_a_players.forEach((pid: string) => {
        if (playerStats[pid]) {
          playerStats[pid].matches += 1
          if (teamAWon) playerStats[pid].wins += 1
        }
      })
      match.team_b_players.forEach((pid: string) => {
        if (playerStats[pid]) {
          playerStats[pid].matches += 1
          if (teamBWon) playerStats[pid].wins += 1
        }
      })
    })
  }

  // Sort players by Wins, then by MMR
  const rankedPlayers = Object.values(playerStats)
    .sort((a, b) => b.wins - a.wins || b.mmr - a.mmr)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col transition-colors p-4 md:p-8">
      <div className="mx-auto max-w-4xl w-full flex flex-col gap-8">
        
        <div className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-2xl shadow p-6 border dark:border-gray-800 transition-colors">
          <div className="flex items-center gap-4">
            <a href="/dashboard" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition text-gray-500">
              <ArrowLeft className="w-6 h-6" />
            </a>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
              <Medal className="w-8 h-8 text-yellow-500" /> {t('title')}
            </h1>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-2xl p-6 shadow">
          {rankedPlayers.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-12">{t('noPlayers')}</p>
          ) : (
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
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${i === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400' : i === 1 ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300' : i === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
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
          )}
        </div>
      </div>
    </div>
  )
}
