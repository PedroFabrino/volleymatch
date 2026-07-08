import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Player } from '@/types/player'
import { DashboardHeader, QuickActionsColumn, PlayerRankingsColumn, RecentMatchesColumn, PastSessionsRow } from '@/features/dashboard'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [activeSession, players, completedMatches, pastSessions] = await Promise.all([
    import('@/lib/services').then(s => s.getActiveSession(supabase, user.id)),
    import('@/lib/services').then(s => s.getPlayers(supabase, user.id)),
    import('@/lib/services').then(s => s.getCompletedMatches(supabase, user.id)),
    import('@/lib/services').then(s => s.getPastSessions(supabase, user.id))
  ])

  const { computeDashboardStats } = await import('@/lib/stats')
  const { playerStats, rankedPlayers, latestMatches } = computeDashboardStats(players as Player[], completedMatches)

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/login')
  }

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
          
          <PastSessionsRow pastSessions={pastSessions as any} />

        </div>
      </div>
    </div>
  )
}

