import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Trophy, ArrowLeft, TrendingUp, Flame, Swords, Calendar, History } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import HighlightsGrid from '../[session_id]/HighlightsGrid'
import { getGlobalSummaryData } from '@/lib/stats/summaryStats'

export default async function GlobalSummaryPage() {
  const supabase = await createClient()

  // Verify auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const t = await getTranslations('Dashboard')
  const ts = await getTranslations('Summary')

  // Calculate global stats
  const {
    playersData,
    leaderboard,
    mvp,
    mostGamesPlayed,
    bestPartner,
    bestPartnerId,
    maxComeback,
    biggestComebackMatch,
    turningPoint,
    maxDiff,
    biggestDiffMatch
  } = await getGlobalSummaryData(supabase, user.id)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col transition-colors p-4 md:p-8">
      <div className="mx-auto max-w-5xl w-full">
        
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="p-3 bg-white dark:bg-gray-900 rounded-full shadow hover:bg-gray-100 dark:hover:bg-gray-800 transition">
              <ArrowLeft className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            </Link>
            <div>
              <h1 className="text-4xl font-black text-gray-900 dark:text-gray-100 flex items-center gap-3">
                <History className="w-8 h-8 text-indigo-500" /> 
                {t('globalSummary')}
              </h1>
              <div className="text-gray-500 dark:text-gray-400 mt-1">
                {t('globalSummaryDesc')}
              </div>
            </div>
          </div>
          <Link href="/dashboard" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition shadow-lg shadow-indigo-900/20">
            {ts('backHome')}
          </Link>
        </div>

        {/* Highlights Grid */}
        <HighlightsGrid 
          sessionId="all"
          mvp={mvp}
          bestPartner={bestPartner}
          biggestComebackMatch={biggestComebackMatch}
          maxComeback={maxComeback}
          turningPoint={turningPoint}
          biggestDiffMatch={biggestDiffMatch}
          maxDiff={maxDiff}
          playersData={playersData}
          isGlobal={true}
          hosterId={user.id}
        />

        {/* Leaderboard Table */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border dark:border-gray-800 overflow-hidden">
          <div className="p-6 border-b dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
            <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100">{ts('leaderboard')}</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">{ts('leaderboardDesc')}</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-800/50">
                  <th className="p-4 font-bold text-gray-600 dark:text-gray-300">#</th>
                  <th className="p-4 font-bold text-gray-600 dark:text-gray-300">{ts('player')}</th>
                  <th className="p-4 font-bold text-gray-600 dark:text-gray-300">{ts('gamesPlayed')}</th>
                  <th className="p-4 font-bold text-gray-600 dark:text-gray-300">{ts('winRate')}</th>
                  <th className="p-4 font-bold text-gray-600 dark:text-gray-300 text-right">{ts('mmrChange')}</th>
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
                          <span className="inline-block px-2 py-0.5 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 text-xs rounded-md uppercase tracking-wider font-bold">{ts('mvp')}</span>
                        )}
                        {player.id === bestPartnerId && (
                          <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs rounded-md uppercase tracking-wider font-bold">{ts('dynamicDuo')}</span>
                        )}
                        {biggestComebackMatch && maxComeback > 0 && (biggestComebackMatch.team_a_score > biggestComebackMatch.team_b_score ? biggestComebackMatch.team_a_players : biggestComebackMatch.team_b_players).includes(player.id) && (
                          <span className="inline-block px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs rounded-md uppercase tracking-wider font-bold">{ts('comebackKids')}</span>
                        )}
                        {biggestDiffMatch && maxDiff > 0 && (biggestDiffMatch.team_a_score > biggestDiffMatch.team_b_score ? biggestDiffMatch.team_a_players : biggestDiffMatch.team_b_players).includes(player.id) && (
                          <span className="inline-block px-2 py-0.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 text-xs rounded-md uppercase tracking-wider font-bold">{ts('unstoppables')}</span>
                        )}
                        {player.id === mostGamesPlayed?.id && (
                          <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs rounded-md uppercase tracking-wider font-bold">{ts('ironman')}</span>
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
                      {ts('noPlayers')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
