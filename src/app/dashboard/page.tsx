import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import ActiveSessionBanner from '@/components/ActiveSessionBanner'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: activeSession } = await supabase
    .from('sessions')
    .select('id')
    .eq('hoster_id', user.id)
    .eq('is_active', true)
    .single()

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col transition-colors">
      <ActiveSessionBanner />
      
      <div className="flex-1 p-8">
        <div className="mx-auto max-w-4xl bg-white dark:bg-gray-900 rounded-2xl shadow p-8 border dark:border-gray-800 transition-colors">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">VolleyMatch Dashboard</h1>
            <form action={signOut}>
              <button className="text-sm font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg transition-colors">
                Sign Out
              </button>
            </form>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Roster Card */}
            <div className="border dark:border-gray-800 rounded-xl p-6 hover:shadow-md transition-shadow bg-gray-50 dark:bg-gray-950">
              <h2 className="text-xl font-semibold mb-2 dark:text-gray-100">My Roster</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-4">Manage your players, MMRs, and positions.</p>
              <a href="/dashboard/roster" className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition">
                View Players
              </a>
            </div>

            {/* Session Card */}
            <div className="border dark:border-gray-800 rounded-xl p-6 hover:shadow-md transition-shadow bg-gray-50 dark:bg-gray-950">
              <h2 className="text-xl font-semibold mb-2 dark:text-gray-100">Game Day</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-4">Take attendance and start matchmaking.</p>
              {activeSession ? (
                <a href="/dashboard/session" className="inline-block bg-yellow-500 text-black px-4 py-2 rounded-lg font-bold hover:bg-yellow-400 transition">
                  Resume Session
                </a>
              ) : (
                <a href="/dashboard/session" className="inline-block bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition">
                  Start Session
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
