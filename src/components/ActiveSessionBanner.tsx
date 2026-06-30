import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Trophy } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { getTranslations } from 'next-intl/server'
import { QrCodeModal } from '@/components/QrCodeModal'

export default async function ActiveSessionBanner() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const t = await getTranslations('Session')

  if (!user) return null

  const { data: activeSession } = await supabase
    .from('sessions')
    .select('id, pin')
    .eq('hoster_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  return (
    <div className="bg-yellow-500 text-black px-4 py-3 shadow-md flex justify-between items-center z-50 relative sticky top-0">
      <div className="flex items-center gap-2 font-bold">
        {activeSession ? (
          <>
            <Trophy className="w-5 h-5" />
            <span>{t('sessionIsLive')}</span>
          </>
        ) : (
          <span className="text-sm">VolleyMatch</span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <LanguageSwitcher />
        <ThemeToggle />
        {activeSession && (
          <div className="flex items-center gap-2">
            <QrCodeModal pin={activeSession.pin || '0000'} />
            <Link 
              href={`/dashboard/live/${activeSession.id}`} 
              className="bg-black text-yellow-500 px-4 py-1.5 rounded-full font-bold text-sm hover:bg-gray-900 transition shadow-sm animate-pulse"
            >
              {t('resumeGame')}
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
