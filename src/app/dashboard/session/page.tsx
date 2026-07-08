import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AttendanceToggle, AttendanceControls } from '@/features/roster'
import { SessionHouseRulesForm, ActiveSessionCard, SessionQueuePanel } from '@/features/session'
import { ArrowLeft, Users } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { getActiveSession, getActiveMatchForSession, getSessionPlayersMap, getPlayersByHoster } from '@/lib/services'
import { buildQueuedPlayerList } from '@/lib/stats'
import { Player } from '@/types/player'

export default async function SessionSetupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const t = await getTranslations('Session')

  if (!user) redirect('/login')

  const players = await getPlayersByHoster(supabase, user.id)

  // Check if there is an active session
  const activeSession = await getActiveSession(supabase, user.id)

  let queuedPlayers: (Player & { games_played_today: number })[] = []

  if (activeSession) {
    const activeMatch = await getActiveMatchForSession(supabase, activeSession.id)
    const sessionPlayersMap = await getSessionPlayersMap(supabase, activeSession.id)
    queuedPlayers = buildQueuedPlayerList(players as Player[], activeMatch, sessionPlayersMap)
  }

  const presentCount = players?.filter(p => p.is_present_today).length || 0

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col transition-colors">
      <div className="flex-1 p-4 md:p-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 flex items-center gap-4">
            <Link href="/dashboard" className="p-2 bg-white dark:bg-gray-900 rounded-full shadow hover:bg-gray-100 dark:hover:bg-gray-800 transition">
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Attendance List */}
            <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-2xl shadow p-6 transition-colors flex flex-col h-[calc(100vh-12rem)] min-h-[500px]">
              <div className="flex justify-between items-center mb-4 border-b dark:border-gray-800 pb-4 shrink-0">
                <h2 className="text-xl font-bold dark:text-gray-100">{t('attendance')}</h2>
                <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 text-sm font-bold px-3 py-1 rounded-full flex items-center gap-2">
                  <Users className="w-4 h-4" /> {t('present', { count: presentCount })}
                </span>
              </div>
              
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 shrink-0">{t('attendanceDesc')}</p>

              <div className="flex flex-col gap-2 flex-1 overflow-y-auto pr-2">
                {players?.map(player => (
                  <AttendanceToggle key={player.id} player={player} activeSessionId={activeSession?.id} />
                ))}
                {players?.length === 0 && (
                  <div className="text-center text-gray-500 py-8 dark:text-gray-400">
                    {t('emptyRoster')}
                  </div>
                )}
              </div>
              
              {players && players.length > 0 && (
                <AttendanceControls activeSessionId={activeSession?.id} />
              )}
            </div>

            {/* Session Rules / Active Info */}
            <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-2xl shadow p-6 h-fit sticky top-6 transition-colors">
              {activeSession ? (
                <div className="flex flex-col gap-6">
                  <ActiveSessionCard session={activeSession} />
                  <SessionQueuePanel queuedPlayers={queuedPlayers} />
                </div>
              ) : (
                <SessionHouseRulesForm presentCount={presentCount} />
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
