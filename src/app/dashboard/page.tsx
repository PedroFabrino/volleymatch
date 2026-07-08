import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { resolveEffectiveHosterId } from '@/lib/auth/host-context'
import {
  getActiveSession,
  getPlayers,
  getCompletedMatches,
  getPastSessions,
} from '@/lib/services'
import { computeDashboardStats } from '@/lib/stats'
import {
  DashboardHeader,
  QuickActionsColumn,
  PlayerRankingsColumn,
  RecentMatchesColumn,
  PastSessionsRow,
  signOut,
} from '@/features/dashboard'
import { DelegateInviteCards, getDashboardHostContext } from '@/features/host-delegation'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const effectiveHosterId = await resolveEffectiveHosterId(user.id)
  const ctx = await getDashboardHostContext(user.id)

  const [activeSession, players, completedMatches, pastSessions] = await Promise.all([
    getActiveSession(supabase, effectiveHosterId),
    getPlayers(supabase, effectiveHosterId),
    getCompletedMatches(supabase, effectiveHosterId),
    getPastSessions(supabase, effectiveHosterId),
  ])

  const { playerStats, rankedPlayers, latestMatches } = computeDashboardStats(players, completedMatches)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col transition-colors">
      <div className="flex-1 p-4 md:p-8">
        <div className="mx-auto max-w-6xl flex flex-col gap-8">

          <DashboardHeader signOutAction={signOut} />

          {!ctx.isSubstituteMode && (
            <DelegateInviteCards grants={ctx.incomingGrants} />
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <QuickActionsColumn
              hasActiveSession={!!activeSession}
              playerCount={players?.length || 0}
              showShareAccess={!ctx.isSubstituteMode}
            />
            <PlayerRankingsColumn rankedPlayers={rankedPlayers} />
            <RecentMatchesColumn latestMatches={latestMatches} playerStats={playerStats} />
          </div>

          <PastSessionsRow pastSessions={pastSessions} />

        </div>
      </div>
    </div>
  )
}
