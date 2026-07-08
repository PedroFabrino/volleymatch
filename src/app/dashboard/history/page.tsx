import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPlayers, getCompletedMatchesWithEvents } from '@/lib/services'
import { History as HistoryIcon, ArrowLeft } from 'lucide-react'
import { TimelineViewer } from '@/features/summary'
import { getTranslations } from 'next-intl/server'

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const t = await getTranslations('History')
  const tCommon = await getTranslations('Common')

  if (!user) redirect('/login')

  const players = await getPlayers(supabase, user.id)
  const completedMatches = await getCompletedMatchesWithEvents(supabase, user.id)

  const playerNames: Record<string, string> = {}
  if (players) {
    players.forEach(p => {
      playerNames[p.id] = p.name
    })
  }

  const getPlayerName = (id: string) => playerNames[id] || tCommon('unknownPlayer')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col transition-colors p-4 md:p-8">
      <div className="mx-auto max-w-4xl w-full flex flex-col gap-8">
        
        <div className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-2xl shadow p-6 border dark:border-gray-800 transition-colors">
          <div className="flex items-center gap-4">
            <a href="/dashboard" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition text-gray-500">
              <ArrowLeft className="w-6 h-6" />
            </a>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
              <HistoryIcon className="w-8 h-8 text-gray-400" /> {t('title')}
            </h1>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {!completedMatches || completedMatches.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-2xl p-12 shadow text-center">
              <p className="text-gray-500 dark:text-gray-400">{t('noHistory')}</p>
            </div>
          ) : (
            completedMatches.map(match => (
              <div key={match.id} className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-2xl p-6 shadow hover:shadow-md transition">
                <div className="flex justify-between items-center mb-6 pb-4 border-b dark:border-gray-800">
                  <div className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {new Date(match.created_at).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="flex items-center gap-4 font-black text-3xl">
                    <span className={`${match.team_a_score > match.team_b_score ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}`}>{match.team_a_score}</span>
                    <span className="text-gray-300 dark:text-gray-600">-</span>
                    <span className={`${match.team_b_score > match.team_a_score ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>{match.team_b_score}</span>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-8">
                  <div className="flex-1">
                    <div className="font-bold text-red-500 mb-3 text-lg border-b border-red-500/20 pb-2">{t('redTeam')}</div>
                    <ul className="flex flex-col gap-1.5">
                      {match.team_a_players.map((id: string) => (
                        <li key={id} className="text-gray-700 dark:text-gray-300 font-medium">
                          {getPlayerName(id)}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="hidden sm:block w-px bg-gray-200 dark:bg-gray-800" />
                  
                    <div className="flex-1 sm:text-right">
                      <div className="font-bold text-blue-500 mb-3 text-lg border-b border-blue-500/20 pb-2">{t('blueTeam')}</div>
                      <ul className="flex flex-col gap-1.5 items-start sm:items-end">
                        {match.team_b_players.map((id: string) => (
                          <li key={id} className="text-gray-700 dark:text-gray-300 font-medium">
                            {getPlayerName(id)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <TimelineViewer 
                    timeline={match.match_events} 
                    matchStartTime={match.created_at}
                    playerNames={playerNames} 
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    )
  }
