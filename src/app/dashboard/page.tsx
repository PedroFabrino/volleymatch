import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  getActiveSession,
  getPlayers,
  getCompletedMatches,
  getPastSessions,
} from '@/lib/services'
import { computeDashboardStats } from '@/lib/stats'
import { DashboardHeader, QuickActionsColumn, PlayerRankingsColumn, RecentMatchesColumn, PastSessionsRow, signOut } from '@/features/dashboard'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [activeSession, players, completedMatches, pastSessions] = await Promise.all([
    getActiveSession(supabase, user.id),
    getPlayers(supabase, user.id),
    getCompletedMatches(supabase, user.id),
    getPastSessions(supabase, user.id),
  ])

  const { playerStats, rankedPlayers, latestMatches } = computeDashboardStats(players, completedMatches)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col transition-colors">
      <div className="flex-1 p-4 md:p-8">
        <div className="mx-auto max-w-6xl flex flex-col gap-8">
          
          <DashboardHeader signOutAction={signOut} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <QuickActionsColumn hasActiveSession={!!activeSession} playerCount={players?.length || 0} />
            <PlayerRankingsColumn rankedPlayers={rankedPlayers} />
            <RecentMatchesColumn latestMatches={latestMatches} playerStats={playerStats} />
          </div>
          
          <PastSessionsRow pastSessions={pastSessions} />

        </div>
      </div>
    </div>
  )
}
