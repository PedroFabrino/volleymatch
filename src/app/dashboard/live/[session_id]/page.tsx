import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { endSession } from '@/features/session'
import { Scoreboard } from '@/features/live-session'
import { Matchmaker } from '@/features/live-session'
import { QrCodeModal } from '@/components/ui/QrCodeModal'
import { previewNextDraft, sortPlayersByDraftPriority } from '@/lib/matchmaking'
import { RealtimeSubscriber } from '@/features/spectator'
import { getLiveSessionData } from '@/lib/services'
export default async function LiveSessionPage(props: { params: Promise<{ session_id: string }> }) {
  const params = await props.params
  const sessionId = params.session_id

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Run all independent queries in parallel to drastically speed up page loads and revalidatePath
  const { session, activeMatch, players, sessionPlayersData, completedMatchesCount } = await getLiveSessionData(supabase, sessionId, user.id)

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
          <Matchmaker session={session} players={playersWithGames} isFirstMatch={isFirstMatch} onEndSession={endSession} />
        )}
      </div>
    </div>
  )
}
