import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import SpectatorScoreboard from './SpectatorScoreboard'
import SpectatorMatchmaker from './SpectatorMatchmaker'
import RealtimeSubscriber from './RealtimeSubscriber'
import { previewNextDraft, sortPlayersByDraftPriority } from '@/utils/matchmaking'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { unstable_cache } from 'next/cache'

const getSessionPlayers = async (sessionId: string, hosterId: string) => {
  return unstable_cache(
    async () => {
      const supabase = createAdminClient()
      const { data: rawPlayers } = await supabase
        .from('players')
        .select('*')
        .eq('hoster_id', hosterId)
        .eq('is_present_today', true)

      const { data: sessionPlayers } = await supabase
        .from('session_players')
        .select('player_id, games_played')
        .eq('session_id', sessionId)

      return { rawPlayers, sessionPlayers }
    },
    ['spectator-players', sessionId],
    { revalidate: 5, tags: [`session-${sessionId}`] }
  )()
}

export default async function ViewSessionPage(props: { params: Promise<{ pin: string }> }) {
  const params = await props.params
  const pin = params.pin

  const supabase = await createClient()

  // 1. Get Session Details by PIN (must be active)
  const { data: session, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('pin', pin)
    .eq('is_active', true)
    .single()

  if (error) {
    console.error('Supabase Error fetching session:', error)
  }

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
  const { rawPlayers, sessionPlayers } = await getSessionPlayers(session.id, session.hoster_id)

  const players = (rawPlayers || []).map(p => {
    const sp = sessionPlayers?.find(sp => sp.player_id === p.id)
    return {
      ...p,
      games_played_today: sp ? sp.games_played : 0
    }
  })

  // 4. Get Last Completed Match (for previewing the next draft accurately in strict mode)
  const { data: lastCompletedMatch } = await supabase
    .from('matches')
    .select('team_a_players, team_b_players')
    .eq('session_id', session.id)
    .eq('is_completed', true)
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const lastWinners = activeMatch 
    ? activeMatch.team_a_players 
    : (lastCompletedMatch?.team_a_players || [])
    
  const lastLosers = activeMatch 
    ? activeMatch.team_b_players 
    : (lastCompletedMatch?.team_b_players || []) // Doesn't matter which is which for the preview as long as they are separated from the bench

  const isFirstMatch = lastWinners.length === 0 && lastLosers.length === 0;

  // Sort players by draft priority so UI Queue perfectly aligns with the engine's internal logic
  const sortedPlayers = [...players].sort((a, b) => sortPlayersByDraftPriority(a, b, isFirstMatch))

  const playersWithStatus = previewNextDraft(
    sortedPlayers,
    lastWinners,
    lastLosers,
    session.matchmaking_mode === 'strict'
  )

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col pb-8">
      <RealtimeSubscriber sessionId={session.id} />
      
      <div className="bg-gray-900 border-b border-gray-800 p-4 text-center relative flex justify-between items-center">
        <div className="w-16"></div>
        <div>
          <h1 className="text-xl font-bold">VolleyMatch Live</h1>
          <p className="text-sm text-gray-400">PIN: {pin}</p>
        </div>
        <div className="w-16 flex justify-end">
          <LanguageSwitcher />
        </div>
      </div>

      <div className="flex-1 mt-4 px-4 max-w-4xl mx-auto w-full">
        {activeMatch ? (
          <SpectatorScoreboard session={session} match={activeMatch} playersWithStatus={playersWithStatus} />
        ) : (
          <SpectatorMatchmaker session={session} playersWithStatus={playersWithStatus} />
        )}
      </div>
    </div>
  )
}
