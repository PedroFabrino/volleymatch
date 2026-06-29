import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Scoreboard from './Scoreboard'
import Matchmaker from './Matchmaker'

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
    <div className="min-h-screen bg-gray-900 text-white">
      {activeMatch ? (
        <Scoreboard session={session} match={activeMatch} players={players || []} />
      ) : (
        <Matchmaker session={session} players={players || []} />
      )}
    </div>
  )
}
