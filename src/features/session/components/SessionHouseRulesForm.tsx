import { getTranslations } from 'next-intl/server'
import { startSession } from '@/features/session'

type SessionHouseRulesFormProps = {
  presentCount: number
}

export default async function SessionHouseRulesForm({ presentCount }: SessionHouseRulesFormProps) {
  const t = await getTranslations('Session')

  return (
    <form action={startSession} className="flex flex-col gap-6">
      <h2 className="text-xl font-bold mb-4 border-b dark:border-gray-800 pb-4 dark:text-gray-100">{t('houseRules')}</h2>
      
      <div className="flex flex-col gap-2">
        <label className="font-semibold text-gray-700 dark:text-gray-300">{t('targetScore')}</label>
        <select name="target_score" className="border dark:border-gray-700 bg-white dark:bg-gray-800 text-black dark:text-white rounded-lg p-3 text-lg outline-none focus:ring-2 focus:ring-blue-500">
          <option value="12">{t('pts12')}</option>
          <option value="10">{t('pts10')}</option>
          <option value="15">{t('pts15')}</option>
          <option value="21">{t('pts21')}</option>
          <option value="25">{t('pts25')}</option>
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="font-semibold text-gray-700 dark:text-gray-300">{t('tieBreakerRule')}</label>
        <div className="flex flex-col gap-3">
          <label className="flex items-start gap-3 p-3 border dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            <input type="radio" name="tie_breaker_rule" value="win_by_2" className="mt-1 dark:bg-gray-900 dark:border-gray-600" />
            <div>
              <div className="font-bold dark:text-gray-100">{t('winBy2')}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{t('winBy2Desc')}</div>
            </div>
          </label>
          <label className="flex items-start gap-3 p-3 border dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            <input type="radio" name="tie_breaker_rule" value="flat_plus_3" defaultChecked className="mt-1 dark:bg-gray-900 dark:border-gray-600" />
            <div>
              <div className="font-bold dark:text-gray-100">{t('flat3')}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{t('flat3Desc')}</div>
            </div>
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-2 mt-2 pt-4 border-t dark:border-gray-800">
        <label className="font-semibold text-gray-700 dark:text-gray-300">{t('matchmakingMode')}</label>
        <div className="flex flex-col gap-3">
          <label className="flex items-start gap-3 p-3 border dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            <input type="radio" name="matchmaking_mode" value="casual" className="mt-1 dark:bg-gray-900 dark:border-gray-600" />
            <div>
              <div className="font-bold dark:text-gray-100">{t('casual')}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{t('casualDesc')}</div>
            </div>
          </label>
          <label className="flex items-start gap-3 p-3 border dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            <input type="radio" name="matchmaking_mode" value="strict" defaultChecked className="mt-1 dark:bg-gray-900 dark:border-gray-600" />
            <div>
              <div className="font-bold dark:text-gray-100">{t('strict')}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{t('strictDesc')}</div>
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
        {t('startSession')}
      </button>
      {presentCount < 2 && (
        <p className="text-center text-sm text-red-500 dark:text-red-400">{t('needMorePlayers')}</p>
      )}
    </form>
  )
}
