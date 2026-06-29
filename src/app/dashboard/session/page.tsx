import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { startSession, endSession } from './actions'
import AttendanceToggle from './AttendanceToggle'
import ActiveSessionBanner from '@/components/ActiveSessionBanner'
import { ArrowLeft, Users, Trophy } from 'lucide-react'

export default async function SessionSetupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: players } = await supabase
    .from('players')
    .select('*')
    .order('name', { ascending: true })

  // Check if there is an active session
  const { data: activeSession } = await supabase
    .from('sessions')
    .select('id')
    .eq('hoster_id', user.id)
    .eq('is_active', true)
    .single()

  let activeMatch = null
  let queuedPlayers: any[] = []

  if (activeSession) {
    const { data: match } = await supabase
      .from('matches')
      .select('team_a_players, team_b_players')
      .eq('session_id', activeSession.id)
      .eq('is_completed', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      
    activeMatch = match

    if (activeMatch) {
      const playingIds = new Set([...activeMatch.team_a_players, ...activeMatch.team_b_players])
      queuedPlayers = players
        ?.filter(p => p.is_present_today && !playingIds.has(p.id))
        .sort((a, b) => a.games_played_today - b.games_played_today) || []
    } else {
      queuedPlayers = players?.filter(p => p.is_present_today) || []
    }
  }

  const presentCount = players?.filter(p => p.is_present_today).length || 0

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col transition-colors">
      <ActiveSessionBanner />

      <div className="flex-1 p-4 md:p-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 flex items-center gap-4">
            <Link href="/dashboard" className="p-2 bg-white dark:bg-gray-900 rounded-full shadow hover:bg-gray-100 dark:hover:bg-gray-800 transition">
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Game Day Setup</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Attendance List */}
            <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-2xl shadow p-6 transition-colors">
              <div className="flex justify-between items-center mb-4 border-b dark:border-gray-800 pb-4">
                <h2 className="text-xl font-bold dark:text-gray-100">1. Attendance</h2>
                <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 text-sm font-bold px-3 py-1 rounded-full flex items-center gap-2">
                  <Users className="w-4 h-4" /> {presentCount} Present
                </span>
              </div>
              
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Tap to mark who is currently at the court.</p>

              <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto pr-2">
                {players?.map(player => (
                  <AttendanceToggle key={player.id} player={player} />
                ))}
                {players?.length === 0 && (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">Your roster is empty. Go to My Roster to add friends.</p>
                )}
              </div>
            </div>

            {/* Session Rules / Active Info */}
            <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-2xl shadow p-6 h-fit sticky top-6 transition-colors">
              {activeSession ? (
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col items-center justify-center text-center bg-yellow-50 dark:bg-yellow-900/10 p-6 rounded-xl border border-yellow-200 dark:border-yellow-900/30">
                    <Trophy className="w-12 h-12 text-yellow-500 mb-3" />
                    <h3 className="text-xl font-bold mb-1 dark:text-gray-100">Session is Live</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Edit attendance on the left, then jump back into the game.</p>
                    <Link 
                      href={`/dashboard/live/${activeSession.id}`} 
                      className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 rounded-xl shadow transition text-center animate-pulse mb-3"
                    >
                      Resume Game
                    </Link>
                    <form action={async () => {
                      'use server'
                      await endSession(activeSession.id)
                    }} className="w-full">
                      <button type="submit" className="w-full bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 font-bold py-2 rounded-xl transition-colors">
                        End Game Day
                      </button>
                    </form>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-bold mb-3 border-b dark:border-gray-800 pb-2 flex items-center justify-between dark:text-gray-100">
                      Next in Queue
                      <span className="bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs px-2 py-1 rounded-full">{queuedPlayers.length} Waiting</span>
                    </h3>
                    
                    {queuedPlayers.length === 0 ? (
                      <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">No one is waiting in the queue.</p>
                    ) : (
                      <ul className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2">
                        {queuedPlayers.map((p, i) => (
                          <li key={p.id} className="flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border dark:border-gray-800">
                            <div className="flex items-center gap-3">
                              <div className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400 font-bold w-6 h-6 rounded-full flex items-center justify-center text-xs">
                                {i + 1}
                              </div>
                              <span className="font-semibold text-gray-900 dark:text-gray-100">{p.name}</span>
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{Math.floor(p.games_played_today)} games played</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ) : (
                <form action={startSession} className="flex flex-col gap-6">
                  <h2 className="text-xl font-bold mb-4 border-b dark:border-gray-800 pb-4 dark:text-gray-100">2. House Rules</h2>
                  
                  <div className="flex flex-col gap-2">
                    <label className="font-semibold text-gray-700 dark:text-gray-300">Target Score</label>
                    <select name="target_score" className="border dark:border-gray-700 bg-white dark:bg-gray-800 text-black dark:text-white rounded-lg p-3 text-lg outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="12">12 Points (Standard)</option>
                      <option value="10">10 Points (Fast)</option>
                      <option value="15">15 Points</option>
                      <option value="21">21 Points</option>
                      <option value="25">25 Points (Official)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="font-semibold text-gray-700 dark:text-gray-300">Tie-Breaker Rule</label>
                    <div className="flex flex-col gap-3">
                      <label className="flex items-start gap-3 p-3 border dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                        <input type="radio" name="tie_breaker_rule" value="win_by_2" defaultChecked className="mt-1 dark:bg-gray-900 dark:border-gray-600" />
                        <div>
                          <div className="font-bold dark:text-gray-100">Win by 2</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">Classic volleyball rules. Must win by a margin of 2 points.</div>
                        </div>
                      </label>
                      <label className="flex items-start gap-3 p-3 border dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                        <input type="radio" name="tie_breaker_rule" value="flat_plus_3" className="mt-1 dark:bg-gray-900 dark:border-gray-600" />
                        <div>
                          <div className="font-bold dark:text-gray-100">Flat +3 Extension</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">If tied at Match Point, target permanently increases by 3.</div>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 mt-2 pt-4 border-t dark:border-gray-800">
                    <label className="font-semibold text-gray-700 dark:text-gray-300">Matchmaking Mode</label>
                    <div className="flex flex-col gap-3">
                      <label className="flex items-start gap-3 p-3 border dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                        <input type="radio" name="matchmaking_mode" value="casual" defaultChecked className="mt-1 dark:bg-gray-900 dark:border-gray-600" />
                        <div>
                          <div className="font-bold dark:text-gray-100">Casual Balance (6v6)</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">Automatically drafts the 12 most rested players and distributes setters.</div>
                        </div>
                      </label>
                      <label className="flex items-start gap-3 p-3 border dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                        <input type="radio" name="matchmaking_mode" value="strict" className="mt-1 dark:bg-gray-900 dark:border-gray-600" />
                        <div>
                          <div className="font-bold dark:text-gray-100">Strict Positional (7v7 Class)</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">Drafts exactly 1 Setter, 2 Offsides, 1 Opposite, 2 Middles, and 1 Libero per team (14 players total).</div>
                        </div>
                      </label>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={presentCount < 2}
                    className={`mt-4 py-4 rounded-xl font-bold text-lg transition-colors ${
                      presentCount < 2 
                        ? 'bg-gray-300 text-gray-500 dark:bg-gray-800 dark:text-gray-600 cursor-not-allowed' 
                        : 'bg-green-600 text-white hover:bg-green-700 shadow-lg'
                    }`}
                  >
                    Start Session
                  </button>
                  {presentCount < 2 && (
                    <p className="text-center text-sm text-red-500 dark:text-red-400">Need at least 2 players to start a session.</p>
                  )}
                </form>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
