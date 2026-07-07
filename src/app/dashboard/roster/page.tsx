import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { addPlayer, deletePlayer, updatePlayer } from '@/features/roster'
import { User, Shield, Activity, Trash2, ArrowLeft, Edit2 } from 'lucide-react'
import ActiveSessionBanner from '@/components/ActiveSessionBanner'
import { getTranslations } from 'next-intl/server'

export default async function RosterPage(props: { searchParams: Promise<{ error?: string, edit?: string }> }) {
  const searchParams = await props.searchParams
  const editId = searchParams?.edit
  
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const t = await getTranslations('Roster')
  const posT = await getTranslations('Positions')

  if (!user) {
    redirect('/login')
  }

  // Fetch all players for this hoster
  const { data: players } = await supabase
    .from('players')
    .select('*')
    .order('name', { ascending: true })

  const availablePositions = [
    'Setter', 'Outside Hitter', 'Middle Blocker', 'Libero', 'Opposite Hitter'
  ]

  const editingPlayer = editId ? players?.find(p => p.id === editId) : null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col transition-colors">
      <ActiveSessionBanner />

      <div className="flex-1 p-4 md:p-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 flex items-center gap-4">
            <Link href="/dashboard" className="p-2 bg-white dark:bg-gray-900 rounded-full shadow hover:bg-gray-100 dark:hover:bg-gray-800 transition">
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Add Player Form */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-2xl shadow p-6 sticky top-6 transition-colors">
                <h2 className="text-xl font-bold mb-4 border-b dark:border-gray-800 pb-2 dark:text-gray-100">
                  {editingPlayer ? t('editPlayer') : t('addNew')}
                </h2>
                
                {searchParams?.error && (
                  <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm font-semibold border border-red-200">
                    {t('duplicateError')}
                  </div>
                )}
                
                <form action={editingPlayer ? updatePlayer : addPlayer} className="flex flex-col gap-4">
                {editingPlayer && <input type="hidden" name="id" value={editingPlayer.id} />}
                
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="name" className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('playerName')}</label>
                  <input 
                    id="name" 
                    name="name" 
                    type="text" 
                    required 
                    defaultValue={editingPlayer?.name}
                    placeholder={t('playerNamePlaceholder')}
                    className="rounded-lg border dark:border-gray-700 p-2 text-black dark:text-white bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="initial_tier" className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('initialTier')}</label>
                  <select 
                    id="initial_tier" 
                    name="initial_tier"
                    defaultValue={editingPlayer?.initial_tier || 'Beginner'}
                    className="rounded-lg border dark:border-gray-700 p-2 text-black dark:text-white bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Beginner">{t('beginner')}</option>
                    <option value="Intermediate">{t('intermediate')}</option>
                    <option value="Advanced">{t('advanced')}</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('positionsLabel')}</label>
                  <div className="flex flex-col gap-2 mt-1">
                    {availablePositions.map(pos => (
                      <label key={pos} className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          name="positions" 
                          value={pos} 
                          defaultChecked={editingPlayer?.positions?.includes(pos)}
                          className="rounded text-blue-600 w-4 h-4 dark:bg-gray-800 dark:border-gray-700" 
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{posT(pos as any)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button type="submit" className="mt-4 w-full rounded-lg bg-blue-600 py-2 text-white font-bold hover:bg-blue-700 transition">
                  {editingPlayer ? t('updatePlayer') : t('addToRoster')}
                </button>
                {editingPlayer && (
                  <Link href="/dashboard/roster" className="text-center w-full rounded-lg bg-gray-200 dark:bg-gray-800 py-2 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-300 dark:hover:bg-gray-700 transition">
                    {t('cancel')}
                  </Link>
                )}
              </form>
            </div>
          </div>

          {/* Player List */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-2xl shadow p-6 transition-colors">
              <h2 className="text-xl font-bold mb-4 border-b dark:border-gray-800 pb-2 dark:text-gray-100">{t('currentPlayers', { count: players?.length || 0 })}</h2>
              
              {!players || players.length === 0 ? (
                <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                  <User className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                  <p>{t('emptyRoster')}</p>
                  <p className="text-sm">{t('addFriends')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {players.map((player) => (
                    <div key={player.id} className="border dark:border-gray-700 rounded-xl p-4 flex flex-col gap-3 hover:border-blue-300 dark:hover:border-blue-500 transition">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">{player.name}</h3>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            player.initial_tier === 'Beginner' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            player.initial_tier === 'Intermediate' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                            'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                          }`}>
                            {player.initial_tier}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Link href={`/dashboard/roster?edit=${player.id}`} className="text-gray-400 hover:text-blue-500 p-1 transition" title={t('editPlayer')}>
                            <Edit2 className="w-4 h-4" />
                          </Link>
                          <form action={async () => {
                            'use server'
                            await deletePlayer(player.id)
                          }}>
                            <button type="submit" className="text-gray-400 hover:text-red-500 p-1 transition" title={t('removePlayer')}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </form>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-1">
                        <Activity className="w-4 h-4" />
                        <span className="font-medium">{player.mmr} MMR</span>
                      </div>

                      <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <div className="flex flex-wrap gap-1">
                          {player.positions && player.positions.length > 0 ? (
                            player.positions.map((pos: string) => (
                              <span key={pos} className="bg-gray-100 dark:bg-gray-800 border dark:border-gray-700 text-xs px-1.5 py-0.5 rounded">{posT(pos as any)}</span>
                            ))
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500 italic">{t('noPosition')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
      </div>
    </div>
  )
}
