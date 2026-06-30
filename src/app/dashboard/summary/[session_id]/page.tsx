import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Trophy, ArrowLeft, TrendingUp, Flame, Swords, Calendar } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export default async function SessionSummaryPage(props: { params: Promise<{ session_id: string }> }) {
  const params = await props.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const t = await getTranslations('Summary')

  if (!user) redirect('/login')

  const sessionId = params.session_id

  // 1. Fetch Session Info
  const { data: session } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('hoster_id', user.id)
    .single()

  if (!session) redirect('/dashboard')

  // 2. Fetch all completed matches
  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .eq('session_id', sessionId)
    .eq('is_completed', true)

  // 3. Fetch mmr history for this session
  const { data: mmrHistory } = await supabase
    .from('mmr_history')
    .select('player_id, mmr_change, reason')
    .eq('session_id', sessionId)
    .eq('reason', 'match_result')

  // 4. Fetch session players to get names and games_played
  const { data: sessionPlayers } = await supabase
    .from('session_players')
    .select('games_played, players ( id, name )')
    .eq('session_id', sessionId)

  const playersData = sessionPlayers?.map(sp => ({
    id: (sp.players as any).id,
    name: (sp.players as any).name,
    games_played: sp.games_played
  })) || []

  // --- Calculate MVP & Leaderboard ---
  const mmrGains: Record<string, number> = {}
  mmrHistory?.forEach(row => {
    mmrGains[row.player_id] = (mmrGains[row.player_id] || 0) + row.mmr_change
  })

  const wins: Record<string, number> = {}
  matches?.forEach(match => {
    const winner = match.team_a_score > match.team_b_score ? 'a' : 'b'
    const winningPlayers = winner === 'a' ? match.team_a_players : match.team_b_players
    winningPlayers.forEach((id: string) => {
      wins[id] = (wins[id] || 0) + 1
    })
  })

  const leaderboard = playersData
    .filter(p => p.games_played > 0)
    .map(p => ({
      ...p,
      mmrChange: mmrGains[p.id] || 0,
      wins: wins[p.id] || 0,
      winRate: Math.round(((wins[p.id] || 0) / p.games_played) * 100)
    }))
    .sort((a, b) => b.mmrChange - a.mmrChange)

  const mvp = leaderboard.length > 0 ? leaderboard[0] : null
  const mostGamesPlayed = [...leaderboard].sort((a, b) => b.games_played - a.games_played)[0]

  // --- Calculate Biggest Difference ---
  let biggestDiffMatch: any = null
  let maxDiff = -1
  
  // --- Calculate Biggest Comeback ---
  let biggestComebackMatch: any = null
  let maxComeback = -1

  matches?.forEach(match => {
    const diff = Math.abs(match.team_a_score - match.team_b_score)
    if (diff > maxDiff) {
      maxDiff = diff
      biggestDiffMatch = match
    }

    const winner = match.team_a_score > match.team_b_score ? 'a' : 'b'
    let maxDeficit = 0
    const timeline = match.point_timeline || []
    
    timeline.forEach((event: any) => {
      if (!event.type || event.type === 'score') {
        const deficit = winner === 'a' 
          ? event.scoreB - event.scoreA 
          : event.scoreA - event.scoreB
        if (deficit > maxDeficit) {
          maxDeficit = deficit
        }
      }
    })

    if (maxDeficit > maxComeback) {
      maxComeback = maxDeficit
      biggestComebackMatch = match
    }
  })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col transition-colors p-4 md:p-8">
      <div className="mx-auto max-w-5xl w-full">
        
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="p-3 bg-white dark:bg-gray-900 rounded-full shadow hover:bg-gray-100 dark:hover:bg-gray-800 transition">
              <ArrowLeft className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            </Link>
            <div>
              <h1 className="text-4xl font-black text-gray-900 dark:text-gray-100">{t('title')}</h1>
              <div className="text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-1">
                <Calendar className="w-4 h-4" /> 
                {new Date(session.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
          <Link href="/dashboard" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition shadow-lg shadow-blue-900/20">
            {t('backHome')}
          </Link>
        </div>

        {/* Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          
          {/* MVP Card */}
          <div className="bg-gradient-to-br from-yellow-400 to-amber-600 rounded-3xl p-6 text-white shadow-xl shadow-amber-900/20 relative overflow-hidden">
            <Trophy className="absolute -right-4 -bottom-4 w-32 h-32 opacity-20" />
            <div className="relative z-10">
              <h3 className="text-amber-100 font-bold uppercase tracking-wider text-sm mb-2">{t('mvp')}</h3>
              {mvp ? (
                <>
                  <div className="text-3xl font-black mb-1">{mvp.name}</div>
                  <div className="text-amber-100 flex items-center gap-2 font-bold text-lg">
                    <TrendingUp className="w-5 h-5" /> 
                    +{mvp.mmrChange} MMR
                  </div>
                </>
              ) : (
                <div className="text-xl font-bold">{t('noData')}</div>
              )}
            </div>
          </div>

          {/* Biggest Comeback */}
          <div className="bg-gradient-to-br from-red-500 to-rose-700 rounded-3xl p-6 text-white shadow-xl shadow-red-900/20 relative overflow-hidden">
            <Flame className="absolute -right-4 -bottom-4 w-32 h-32 opacity-20" />
            <div className="relative z-10">
              <h3 className="text-red-200 font-bold uppercase tracking-wider text-sm mb-2">{t('biggestComeback')}</h3>
              {biggestComebackMatch && maxComeback > 0 ? (
                <>
                  <div className="text-3xl font-black mb-1">{maxComeback} {t('points')}</div>
                  <div className="text-red-200 font-bold">
                    {t('finalScore')}: {biggestComebackMatch.team_a_score} - {biggestComebackMatch.team_b_score}
                  </div>
                </>
              ) : (
                <div className="text-xl font-bold">{t('noComebacks')}</div>
              )}
            </div>
          </div>

          {/* Biggest Blowout / Difference */}
          <div className="bg-gradient-to-br from-indigo-500 to-blue-700 rounded-3xl p-6 text-white shadow-xl shadow-indigo-900/20 relative overflow-hidden">
            <Swords className="absolute -right-4 -bottom-4 w-32 h-32 opacity-20" />
            <div className="relative z-10">
              <h3 className="text-indigo-200 font-bold uppercase tracking-wider text-sm mb-2">{t('biggestDifference')}</h3>
              {biggestDiffMatch && maxDiff > 0 ? (
                <>
                  <div className="text-3xl font-black mb-1">{maxDiff} {t('points')}</div>
                  <div className="text-indigo-200 font-bold">
                    {t('score')}: {Math.max(biggestDiffMatch.team_a_score, biggestDiffMatch.team_b_score)} - {Math.min(biggestDiffMatch.team_a_score, biggestDiffMatch.team_b_score)}
                  </div>
                </>
              ) : (
                <div className="text-xl font-bold">{t('noData')}</div>
              )}
            </div>
          </div>

        </div>

        {/* Leaderboard Table */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border dark:border-gray-800 overflow-hidden">
          <div className="p-6 border-b dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
            <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100">{t('leaderboard')}</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">{t('leaderboardDesc')}</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-800/50">
                  <th className="p-4 font-bold text-gray-600 dark:text-gray-300">#</th>
                  <th className="p-4 font-bold text-gray-600 dark:text-gray-300">{t('player')}</th>
                  <th className="p-4 font-bold text-gray-600 dark:text-gray-300">{t('gamesPlayed')}</th>
                  <th className="p-4 font-bold text-gray-600 dark:text-gray-300">{t('winRate')}</th>
                  <th className="p-4 font-bold text-gray-600 dark:text-gray-300 text-right">{t('mmrChange')}</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((player, index) => (
                  <tr key={player.id} className="border-t dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition">
                    <td className="p-4 font-bold text-gray-500 dark:text-gray-400">{index + 1}</td>
                    <td className="p-4 font-bold text-gray-900 dark:text-gray-100">
                      {player.name}
                      {player.id === mostGamesPlayed?.id && (
                        <span className="ml-2 inline-block px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs rounded-md uppercase tracking-wider">{t('ironman')}</span>
                      )}
                    </td>
                    <td className="p-4 text-gray-700 dark:text-gray-300">{player.games_played}</td>
                    <td className="p-4 text-gray-700 dark:text-gray-300">{player.winRate}%</td>
                    <td className={`p-4 font-black text-right ${
                      player.mmrChange > 0 ? 'text-green-600 dark:text-green-400' : 
                      player.mmrChange < 0 ? 'text-red-600 dark:text-red-400' : 
                      'text-gray-500'
                    }`}>
                      {player.mmrChange > 0 ? '+' : ''}{player.mmrChange}
                    </td>
                  </tr>
                ))}
                {leaderboard.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500 dark:text-gray-400">
                      {t('noPlayers')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
