import { History } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

type Session = {
  id: string
  created_at: string
  is_active: boolean
}

type PastSessionsRowProps = {
  pastSessions: Session[] | null
}

export default async function PastSessionsRow({ pastSessions }: PastSessionsRowProps) {
  const t = await getTranslations('Dashboard')

  if (!pastSessions || pastSessions.length === 0) {
    return null
  }

  return (
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
  )
}
