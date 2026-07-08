import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { deletePlayer } from '../actions'
import { User, Shield, Activity, Trash2, Edit2 } from 'lucide-react'
import { Player, PlayerPosition } from '@/types/player'

type PlayerListProps = {
  players: Player[]
}

export default async function PlayerList({ players }: PlayerListProps) {
  const t = await getTranslations('Roster')
  const posT = await getTranslations('Positions')

  return (
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
                      <span key={pos} className="bg-gray-100 dark:bg-gray-800 border dark:border-gray-700 text-xs px-1.5 py-0.5 rounded">{posT(pos as PlayerPosition)}</span>
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
  )
}
