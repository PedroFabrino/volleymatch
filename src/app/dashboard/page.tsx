import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Trophy, Activity, Medal, History } from 'lucide-react'
import { Player } from '@/types/player'
import { getTranslations } from 'next-intl/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const t = await getTranslations('Dashboard')

  if (!user) {
    redirect('/login')
  }

  const [activeSession, players, completedMatches, pastSessions] = await Promise.all([
    import('@/lib/services').then(s => s.getActiveSession(supabase, user.id)),
    import('@/lib/services').then(s => s.getPlayers(supabase, user.id)),
    import('@/lib/services').then(s => s.getCompletedMatches(supabase, user.id)),
    import('@/lib/services').then(s => s.getPastSessions(supabase, user.id))
  ])

  const { computeDashboardStats } = await import('@/lib/stats')
  const { playerStats, rankedPlayers, latestMatches } = computeDashboardStats(players as Player[], completedMatches)

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/login')
  }

  const getPlayerName = (id: string) => playerStats[id]?.name || 'Unknown'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col transition-colors">
      <div className="flex-1 p-4 md:p-8">
        <div className="mx-auto max-w-6xl flex flex-col gap-8">
          
          {/* Header Row */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-8 border dark:border-gray-800 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                <Activity className="w-8 h-8 text-blue-500" /> {t('title')}
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">{t('subtitle')}</p>
            </div>
            <form action={signOut}>
              <button className="text-sm font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg transition-colors">
                {t('signOut')}
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Quick Actions */}
            <div className="flex flex-col gap-6">
              {/* Session Card */}
              <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-2xl p-6 shadow hover:shadow-md transition-shadow">
                <h2 className="text-xl font-semibold mb-2 dark:text-gray-100 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" /> {t('gameDay')}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">{t('gameDayDesc')}</p>
                {activeSession ? (
                  <a href="/dashboard/session" className="block text-center w-full bg-yellow-500 text-black px-4 py-3 rounded-xl font-bold hover:bg-yellow-400 transition animate-pulse">
                    {t('resumeSession')}
                  </a>
                ) : (
                  <a href="/dashboard/session" className="block text-center w-full bg-green-600 text-white px-4 py-3 rounded-xl font-medium hover:bg-green-700 transition">
                    {t('startNewSession')}
                  </a>
                )}
              </div>

              {/* Roster Card */}
              <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-2xl p-6 shadow hover:shadow-md transition-shadow">
                <h2 className="text-xl font-semibold mb-2 dark:text-gray-100 flex items-center gap-2">
                  <Medal className="w-5 h-5 text-blue-500" /> {t('myRoster')}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">{t('myRosterDesc')}</p>
                <a href="/dashboard/roster" className="block text-center w-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-3 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition border dark:border-gray-700">
                  {t('manageRoster', { count: players?.length || 0 })}
                </a>
              </div>

              {/* Global Summary Card */}
              <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-2xl p-6 shadow hover:shadow-md transition-shadow">
                <h2 className="text-xl font-semibold mb-2 dark:text-gray-100 flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-500" /> {t('globalSummary')}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">{t('globalSummaryDesc')}</p>
                <a href="/dashboard/summary/all" className="block text-center w-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-4 py-3 rounded-xl font-medium hover:bg-indigo-200 dark:hover:bg-indigo-800/60 transition border border-indigo-200 dark:border-indigo-800">
                  {t('viewGlobalSummary')}
                </a>
              </div>
            </div>

            {/* Middle Column: Player Rankings */}
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

            {/* Right Column: Latest Matches */}
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

          </div>
          
          {/* Bottom Row: Past Sessions */}
          {pastSessions && pastSessions.length > 0 && (
            <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-2xl p-6 shadow">
              <h2 className="text-xl font-semibold mb-6 dark:text-gray-100 flex items-center gap-2 border-b dark:border-gray-800 pb-3">
                <History className="w-5 h-5 text-purple-500" /> {t('pastSessions')}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {pastSessions.map(session => (
                  <a key={session.id} href={session.is_active ? `/dashboard/session` : `/dashboard/summary/${session.id}`} className="bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 border dark:border-gray-700 rounded-xl p-4 transition flex flex-col items-center text-center gap-2">
                    <div className="text-sm font-bold text-gray-500 dark:text-gray-400">
                      {new Date(session.created_at).toLocaleDateString()}
                    </div>
                    {session.is_active ? (
                      <span className="px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs rounded-full font-bold uppercase">{t('active')}</span>
                    ) : (
                      <span className="px-3 py-1 bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 text-xs rounded-full font-bold uppercase">{t('viewSummary')}</span>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
