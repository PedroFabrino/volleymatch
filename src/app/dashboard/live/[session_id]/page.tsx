import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { endSession } from '@/features/session'
import { Scoreboard, Matchmaker, LiveSessionPinBar } from '@/features/live-session'
import { getLiveSessionViewData } from '@/lib/services'
import { RealtimeSubscriber } from '@/features/spectator'

export default async function LiveSessionPage(props: { params: Promise<{ session_id: string }> }) {
  const params = await props.params
  const sessionId = params.session_id

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const viewData = await getLiveSessionViewData(supabase, sessionId, user.id)

  if (!viewData) redirect('/dashboard')

  const { session, activeMatch, playersWithGames, playersWithStatus, isFirstMatch } = viewData
  const pin = session.pin || '0000'

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <RealtimeSubscriber sessionId={session.id} />
      <LiveSessionPinBar pin={pin} />
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
