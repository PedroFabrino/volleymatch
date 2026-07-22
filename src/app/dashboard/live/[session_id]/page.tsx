import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { endSession } from '@/features/session'
import { Scoreboard, Matchmaker, LiveSessionPinBar } from '@/features/live-session'
import { getLiveSessionViewData } from '@/lib/services'
import { resolveEffectiveHosterId } from '@/lib/auth/host-context'
import { resolveActingContext } from '@/lib/auth/require-host-permission'
import { hasPermission } from '@/lib/auth/hoster-access'

export default async function LiveSessionPage(props: { params: Promise<{ session_id: string }> }) {
  const params = await props.params
  const sessionId = params.session_id

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const effectiveHosterId = await resolveEffectiveHosterId(user.id)
  const ctx = await resolveActingContext(supabase, user.id, sessionId)

  const viewData = await getLiveSessionViewData(supabase, sessionId, effectiveHosterId)

  if (!viewData) redirect('/dashboard')

  const { session, activeMatch, playersWithGames, playersWithStatus, isFirstMatch } = viewData
  const pin = session.pin || '0000'
  const canEndSession = hasPermission(ctx.permissions, 'session_end')
  const isHost = hasPermission(ctx.permissions, 'session_live')

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <LiveSessionPinBar pin={pin} />
      <div className="flex-1">
        {activeMatch ? (
          <Scoreboard
            session={session}
            match={activeMatch}
            players={playersWithGames}
            playersWithStatus={playersWithStatus}
            isHost={isHost}
          />
        ) : (
          <Matchmaker
            session={session}
            players={playersWithGames}
            isFirstMatch={isFirstMatch}
            onEndSession={canEndSession ? endSession : undefined}
          />
        )}
      </div>
    </div>
  )
}
