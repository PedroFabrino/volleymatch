import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { addPlayer, updatePlayer } from '../actions'
import { Player, PlayerPosition } from '@/types/player'

type PlayerFormProps = {
  editingPlayer?: Player | null
  availablePositions: PlayerPosition[]
  searchParamsError?: string
}

export default async function PlayerForm({ editingPlayer, availablePositions, searchParamsError }: PlayerFormProps) {
  const t = await getTranslations('Roster')
  const posT = await getTranslations('Positions')

  return (
    <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-2xl shadow p-6 sticky top-6 transition-colors">
      <h2 className="text-xl font-bold mb-4 border-b dark:border-gray-800 pb-2 dark:text-gray-100">
        {editingPlayer ? t('editPlayer') : t('addNew')}
      </h2>
      
      {searchParamsError && (
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
                <span className="text-sm text-gray-700 dark:text-gray-300">{posT(pos)}</span>
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
  )
}
