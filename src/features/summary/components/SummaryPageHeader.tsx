import Link from 'next/link'
import { ArrowLeft, Calendar } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { ShareButton } from './ShareButton'

type SummaryPageHeaderProps = {
  sessionId: string
  createdAt: string
}

export default async function SummaryPageHeader({ sessionId, createdAt }: SummaryPageHeaderProps) {
  const t = await getTranslations('Summary')

  return (
    <div className="mb-8 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="p-3 bg-white dark:bg-gray-900 rounded-full shadow hover:bg-gray-100 dark:hover:bg-gray-800 transition">
          <ArrowLeft className="w-6 h-6 text-gray-600 dark:text-gray-300" />
        </Link>
        <div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-gray-100">{t('title')}</h1>
          <div className="text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-1">
            <Calendar className="w-4 h-4" />
            {new Date(createdAt).toLocaleDateString()}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <ShareButton sessionId={sessionId} />
        <Link href="/dashboard" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition shadow-lg shadow-blue-900/20 hidden sm:flex">
          {t('backHome')}
        </Link>
      </div>
    </div>
  )
}
