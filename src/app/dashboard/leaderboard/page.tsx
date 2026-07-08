import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPlayers, getCompletedMatches } from '@/lib/services'
import { Medal, ArrowLeft } from 'lucide-react'
import { LeaderboardTable } from '@/features/dashboard'
import { getTranslations } from 'next-intl/server'
import { resolveEffectiveHosterId } from '@/lib/auth/host-context'

export default async function LeaderboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const t = await getTranslations('Leaderboard')

  if (!user) redirect('/login')

  const effectiveHosterId = await resolveEffectiveHosterId(user.id)
  const players = await getPlayers(supabase, effectiveHosterId)
  const completedMatches = await getCompletedMatches(supabase, effectiveHosterId)

  const playerStats: Record<string, { matches: number; wins: number; name: string; mmr: number }> = {}

  if (players) {
    players.forEach(p => {
      playerStats[p.id] = { matches: 0, wins: 0, name: p.name, mmr: p.mmr }
    })
  }

  if (completedMatches) {
    completedMatches.forEach(match => {
      const teamAWon = match.team_a_score > match.team_b_score
      const teamBWon = match.team_b_score > match.team_a_score

      match.team_a_players.forEach((pid: string) => {
        if (playerStats[pid]) {
          playerStats[pid].matches += 1
          if (teamAWon) playerStats[pid].wins += 1
        }
      })
      match.team_b_players.forEach((pid: string) => {
        if (playerStats[pid]) {
          playerStats[pid].matches += 1
          if (teamBWon) playerStats[pid].wins += 1
        }
      })
    })
  }

  const rankedPlayers = Object.values(playerStats)
    .sort((a, b) => b.wins - a.wins || b.mmr - a.mmr)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col transition-colors p-4 md:p-8">
      <div className="mx-auto max-w-4xl w-full flex flex-col gap-8">
        <div className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-2xl shadow p-6 border dark:border-gray-800 transition-colors">
          <div className="flex items-center gap-4">
            <a href="/dashboard" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition text-gray-500">
              <ArrowLeft className="w-6 h-6" />
            </a>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
              <Medal className="w-8 h-8 text-yellow-500" /> {t('title')}
            </h1>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-2xl p-6 shadow">
          <LeaderboardTable rankedPlayers={rankedPlayers} />
        </div>
      </div>
    </div>
  )
}
