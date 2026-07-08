import { Activity } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

type DashboardHeaderProps = {
  signOutAction: () => Promise<void>
}

export default async function DashboardHeader({ signOutAction }: DashboardHeaderProps) {
  const t = await getTranslations('Dashboard')
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-8 border dark:border-gray-800 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
          <Activity className="w-8 h-8 text-blue-500" /> {t('title')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">{t('subtitle')}</p>
      </div>
      <form action={signOutAction}>
        <button className="text-sm font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg transition-colors">
          {t('signOut')}
        </button>
      </form>
    </div>
  )
}
