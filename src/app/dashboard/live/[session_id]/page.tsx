import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Scoreboard from './Scoreboard'
import Matchmaker from './Matchmaker'
import { QrCodeModal } from '@/components/QrCodeModal'

export default async function LiveSessionPage(props: { params: Promise<{ session_id: string }> }) {
  const params = await props.params
  const sessionId = params.session_id

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Get Session Details
  const { data: session } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (!session) redirect('/dashboard')

  // Get Active Match (if any)
  const { data: activeMatch } = await supabase
    .from('matches')
    .select('*')
    .eq('session_id', sessionId)
    .eq('is_completed', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // Get all players so we can resolve names
  const { data: players } = await supabase
    .from('players')
    .select('*')
    .eq('hoster_id', user.id)

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <div className="bg-gray-800 p-2 text-center text-sm text-gray-400 font-mono flex items-center justify-center">
        <span>Room PIN: <span className="text-blue-400 font-bold text-lg">{session.pin || '0000'}</span></span>
        <QrCodeModal pin={session.pin || '0000'} />
      </div>
      <div className="flex-1">
        {activeMatch ? (
          <Scoreboard session={session} match={activeMatch} players={players || []} />
        ) : (
          <Matchmaker session={session} players={players || []} />
        )}
      </div>
    </div>
  )
}
