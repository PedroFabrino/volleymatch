import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { PlayerJoinForm } from '@/features/public-join'
import { getSessionByPin, getPlayersByHoster } from '@/lib/services'

export default async function JoinSessionPage(props: { params: Promise<{ pin: string }> }) {
  const params = await props.params
  const pin = params.pin
  const t = await getTranslations('PublicJoin')

  const supabase = await createClient()

  const { data: session, error } = await getSessionByPin(supabase, pin)

  if (error || !session) {
    redirect('/?error=invalid_pin')
  }

  const players = await getPlayersByHoster(supabase, session.hoster_id)

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col pb-8">
      <div className="bg-gray-900 border-b border-gray-800 p-4 text-center">
        <h1 className="text-xl font-bold">{t('appTitle')}</h1>
        <p className="text-sm text-gray-400">{t('joinSession')}</p>
      </div>

      <div className="flex-1 mt-8 px-4 max-w-md mx-auto w-full">
        <PlayerJoinForm session={session} players={players} />
      </div>
    </div>
  )
}
