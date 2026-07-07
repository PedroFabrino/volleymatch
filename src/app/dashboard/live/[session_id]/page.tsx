import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Scoreboard from './Scoreboard'
import Matchmaker from './Matchmaker'
import { QrCodeModal } from '@/components/QrCodeModal'
import { previewNextDraft, sortPlayersByDraftPriority } from '@/utils/matchmaking'
import RealtimeSubscriber from '@/app/view/[pin]/RealtimeSubscriber'

export default async function LiveSessionPage(props: { params: Promise<{ session_id: string }> }) {
  const params = await props.params
  const sessionId = params.session_id

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Run all independent queries in parallel to drastically speed up page loads and revalidatePath
  const [
    { data: session },
    { data: activeMatch },
    { data: players },
    { data: sessionPlayersData },
    { count: completedMatchesCount }
  ] = await Promise.all([
    supabase.from('sessions').select('*').eq('id', sessionId).single(),
    supabase.from('matches').select('*').eq('session_id', sessionId).eq('is_completed', false).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('players').select('*').eq('hoster_id', user.id),
    supabase.from('session_players').select('player_id, games_played').eq('session_id', sessionId),
    supabase.from('matches').select('*', { count: 'exact', head: true }).eq('session_id', sessionId).eq('is_completed', true)
  ])

  if (!session) redirect('/dashboard')

  const playersWithGames = (players || []).map(p => {
    const sp = sessionPlayersData?.find(sp => sp.player_id === p.id)
    return {
      ...p,
      games_played_today: sp ? sp.games_played : 0
    }
  })

  const isFirstMatch = completedMatchesCount === 0

  const lastWinners = activeMatch ? activeMatch.team_a_players : []
  const lastLosers = activeMatch ? activeMatch.team_b_players : []

  const sortedPlayers = [...playersWithGames]
    .filter(p => p.is_present_today)
    .sort((a, b) => sortPlayersByDraftPriority(a, b, isFirstMatch))

  const playersWithStatus = previewNextDraft(
    sortedPlayers,
    lastWinners,
    lastLosers,
    session.matchmaking_mode === 'strict'
  )

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <RealtimeSubscriber sessionId={session.id} />
      <div className="bg-gray-800 p-2 text-center text-sm text-gray-400 font-mono flex items-center justify-center">
        <span>Room PIN: <span className="text-blue-400 font-bold text-lg">{session.pin || '0000'}</span></span>
        <QrCodeModal pin={session.pin || '0000'} />
      </div>
      <div className="flex-1">
        {activeMatch ? (
          <Scoreboard session={session} match={activeMatch} players={playersWithGames} playersWithStatus={playersWithStatus} />
        ) : (
          <Matchmaker session={session} players={playersWithGames} isFirstMatch={isFirstMatch} />
        )}
      </div>
    </div>
  )
}
