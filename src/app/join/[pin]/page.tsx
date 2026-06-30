import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import PlayerJoinForm from './PlayerJoinForm'

export default async function JoinSessionPage(props: { params: Promise<{ pin: string }> }) {
  const params = await props.params
  const pin = params.pin

  const supabase = await createClient()

  // Get Session Details by PIN (must be active)
  const { data: session, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('pin', pin)
    .eq('is_active', true)
    .single()

  if (error || !session) {
    redirect('/?error=invalid_pin')
  }

  // Get all players for this host so they can select themselves if they are returning
  const { data: players } = await supabase
    .from('players')
    .select('*')
    .eq('hoster_id', session.hoster_id)

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col pb-8">
      <div className="bg-gray-900 border-b border-gray-800 p-4 text-center">
        <h1 className="text-xl font-bold">VolleyMatch</h1>
        <p className="text-sm text-gray-400">Join Session</p>
      </div>

      <div className="flex-1 mt-8 px-4 max-w-md mx-auto w-full">
        <PlayerJoinForm session={session} players={players || []} />
      </div>
    </div>
  )
}
