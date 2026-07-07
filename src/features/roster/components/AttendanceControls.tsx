'use client'

import { useTransition } from 'react'
import { setAllAttendance } from '@/features/session'
import { CheckSquare, Square, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'

export default function AttendanceControls({ activeSessionId }: { activeSessionId?: string }) {
  const [isPending, startTransition] = useTransition()
  const t = useTranslations('Session')

  return (
    <div className="flex items-center gap-2 mt-4 pt-4 border-t dark:border-gray-800">
      <button
        onClick={() => startTransition(() => setAllAttendance(true, activeSessionId))}
        disabled={isPending}
        className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40 rounded-xl font-bold transition disabled:opacity-50"
      >
        {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckSquare className="w-5 h-5" />}
        {t('selectAll')}
      </button>
      
      <button
        onClick={() => startTransition(() => setAllAttendance(false, activeSessionId))}
        disabled={isPending}
        className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 rounded-xl font-bold transition disabled:opacity-50"
      >
        {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Square className="w-5 h-5" />}
        {t('clearAll')}
      </button>
    </div>
  )
}
