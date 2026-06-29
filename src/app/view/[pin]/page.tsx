import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import SpectatorScoreboard from './SpectatorScoreboard'
import SpectatorMatchmaker from './SpectatorMatchmaker'
import RealtimeSubscriber from './RealtimeSubscriber'

export default async function ViewSessionPage(props: { params: Promise<{ pin: string }> }) {
  const params = await props.params
  const pin = params.pin

  const supabase = await createClient()

  // 1. Get Session Details by PIN (must be active)
  const { data: session } = await supabase
    .from('sessions')
    .select('*')
    .eq('pin', pin)
    .eq('is_active', true)
    .single()

  if (!session) {
    // PIN invalid or session ended
    redirect('/?error=invalid_pin')
  }

  // 2. Get Active Match (if any)
  const { data: activeMatch } = await supabase
    .from('matches')
    .select('*')
    .eq('session_id', session.id)
    .eq('is_completed', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // 3. Get all players for this host
  const { data: rawPlayers } = await supabase
    .from('players')
    .select('*')
    .eq('hoster_id', session.hoster_id)
    .eq('is_present_today', true)

  const { data: sessionPlayers } = await supabase
    .from('session_players')
    .select('player_id, games_played')
    .eq('session_id', session.id)

  const players = (rawPlayers || []).map(p => {
    const sp = sessionPlayers?.find(sp => sp.player_id === p.id)
    return {
      ...p,
      games_played_today: sp ? sp.games_played : 0
    }
  })

  // Sort players by games played (the Queue)
  const queue = [...players].sort((a, b) => a.games_played_today - b.games_played_today)


  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col pb-8">
      <RealtimeSubscriber sessionId={session.id} />
      
      <div className="bg-gray-900 border-b border-gray-800 p-4 text-center">
        <h1 className="text-xl font-bold">VolleyMatch Live</h1>
        <p className="text-sm text-gray-400">PIN: {pin}</p>
      </div>

      <div className="flex-1 mt-4 px-4 max-w-4xl mx-auto w-full">
        {activeMatch ? (
          <SpectatorScoreboard session={session} match={activeMatch} players={players || []} queue={queue} />
        ) : (
          <SpectatorMatchmaker session={session} players={players || []} queue={queue} />
        )}
      </div>
    </div>
  )
}
