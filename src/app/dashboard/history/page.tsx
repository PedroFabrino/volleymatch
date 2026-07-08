import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPlayers, getCompletedMatchesWithEvents } from '@/lib/services'
import { History as HistoryIcon, ArrowLeft } from 'lucide-react'
import { HistoryMatchCard } from '@/features/summary'
import { getTranslations } from 'next-intl/server'

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const t = await getTranslations('History')

  if (!user) redirect('/login')

  const players = await getPlayers(supabase, user.id)
  const completedMatches = await getCompletedMatchesWithEvents(supabase, user.id)

  const playerNames: Record<string, string> = {}
  if (players) {
    players.forEach(p => {
      playerNames[p.id] = p.name
    })
  }

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
              <HistoryMatchCard key={match.id} match={match} playerNames={playerNames} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
