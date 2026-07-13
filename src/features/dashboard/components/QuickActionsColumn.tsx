import { Trophy, Medal, History } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

type QuickActionsColumnProps = {
  hasActiveSession: boolean
  playerCount: number
  showShareAccess?: boolean
}

export default async function QuickActionsColumn({
  hasActiveSession,
  playerCount,
  showShareAccess = true,
}: QuickActionsColumnProps) {
  const t = await getTranslations('Dashboard')
  const tAccess = await getTranslations('HostAccess')

  return (
    <div className="flex flex-col gap-6">
      {/* Session Card */}
      <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-2xl p-6 shadow hover:shadow-md transition-shadow">
        <h2 className="text-xl font-semibold mb-2 dark:text-gray-100 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" /> {t('gameDay')}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">{t('gameDayDesc')}</p>
        {hasActiveSession ? (
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
          {t('manageRoster', { count: playerCount })}
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

      {showShareAccess && (
        <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-2xl p-6 shadow hover:shadow-md transition-shadow">
          <h2 className="text-xl font-semibold mb-2 dark:text-gray-100">{tAccess('shareAccessTitle')}</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">{tAccess('shareAccessCardDesc')}</p>
          <a href="/dashboard/access" className="block text-center w-full bg-purple-600 text-white px-4 py-3 rounded-xl font-medium hover:bg-purple-700 transition">
            {tAccess('manageAccess')}
          </a>
        </div>
      )}
    </div>
  )
}
