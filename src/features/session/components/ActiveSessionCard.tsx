import { Trophy } from 'lucide-react'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { endSession } from '@/features/session/actions'

type ActiveSessionCardProps = {
  session: { id: string }
}

export default async function ActiveSessionCard({ session }: ActiveSessionCardProps) {
  const t = await getTranslations('Session')

  return (
    <div className="flex flex-col items-center justify-center text-center bg-yellow-50 dark:bg-yellow-900/10 p-6 rounded-xl border border-yellow-200 dark:border-yellow-900/30">
      <Trophy className="w-12 h-12 text-yellow-500 mb-3" />
      <h3 className="text-xl font-bold mb-1 dark:text-gray-100">{t('sessionIsLive')}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t('sessionLiveDesc')}</p>
      <Link 
        href={`/dashboard/live/${session.id}`} 
        className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 rounded-xl shadow transition text-center animate-pulse mb-3"
      >
        {t('resumeGame')}
      </Link>
      <form action={async () => {
        'use server'
        await endSession(session.id)
      }} className="w-full">
        <button type="submit" className="w-full bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 font-bold py-2 rounded-xl transition-colors">
          {t('endGameDay')}
        </button>
      </form>
    </div>
  )
}
