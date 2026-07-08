import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTranslations } from 'next-intl/server'
import { SpectatorViewSwitch, RealtimeSubscriber } from '@/features/spectator'
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'
import { getSpectatorViewData } from '@/lib/services/spectator.service'

export const dynamic = 'force-dynamic'

async function loadSpectatorViewData(pin: string) {
  const adminSupabase = createAdminClient()
  return getSpectatorViewData(adminSupabase, adminSupabase, pin)
}

export default async function ViewSessionPage(props: { params: Promise<{ pin: string }> }) {
  const params = await props.params
  const pin = params.pin
  const t = await getTranslations('Spectator')

  const { data, error } = await loadSpectatorViewData(pin)

  if (error) {
    console.error('Supabase Error fetching session:', error)
  }

  if (!data) {
    redirect('/?error=invalid_pin')
  }

  const { session, activeMatch, playersWithStatus } = data

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col pb-8">
      <RealtimeSubscriber sessionId={session.id} />

      <div className="bg-gray-900 border-b border-gray-800 p-4 text-center relative flex justify-between items-center">
        <div className="w-16"></div>
        <div>
          <h1 className="text-xl font-bold">{t('liveTitle')}</h1>
          <p className="text-sm text-gray-400">{t('pinLabel', { pin })}</p>
        </div>
        <div className="w-16 flex justify-end">
          <LanguageSwitcher />
        </div>
      </div>

      <div className="flex-1 mt-4 px-4 max-w-4xl mx-auto w-full">
        <SpectatorViewSwitch
          session={session}
          activeMatch={activeMatch}
          playersWithStatus={playersWithStatus}
        />
      </div>
    </div>
  )
}
