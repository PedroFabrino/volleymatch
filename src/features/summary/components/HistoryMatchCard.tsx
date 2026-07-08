import { getTranslations } from 'next-intl/server'
import { TimelineViewer } from '@/features/summary'
import type { MatchWithEvents } from '@/types/match'

type HistoryMatchCardProps = {
  match: MatchWithEvents
  playerNames: Record<string, string>
}

export default async function HistoryMatchCard({ match, playerNames }: HistoryMatchCardProps) {
  const t = await getTranslations('History')
  const tCommon = await getTranslations('Common')

  const getPlayerName = (id: string) => playerNames[id] || tCommon('unknownPlayer')

  return (
    <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-2xl p-6 shadow hover:shadow-md transition">
      <div className="flex justify-between items-center mb-6 pb-4 border-b dark:border-gray-800">
        <div className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {new Date(match.created_at).toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
        <div className="flex items-center gap-4 font-black text-3xl">
          <span className={`${match.team_a_score > match.team_b_score ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}`}>
            {match.team_a_score}
          </span>
          <span className="text-gray-300 dark:text-gray-600">-</span>
          <span className={`${match.team_b_score > match.team_a_score ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
            {match.team_b_score}
          </span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-8">
        <div className="flex-1">
          <div className="font-bold text-red-500 mb-3 text-lg border-b border-red-500/20 pb-2">{t('redTeam')}</div>
          <ul className="flex flex-col gap-1.5">
            {match.team_a_players.map(id => (
              <li key={id} className="text-gray-700 dark:text-gray-300 font-medium">
                {getPlayerName(id)}
              </li>
            ))}
          </ul>
        </div>

        <div className="hidden sm:block w-px bg-gray-200 dark:bg-gray-800" />

        <div className="flex-1 sm:text-right">
          <div className="font-bold text-blue-500 mb-3 text-lg border-b border-blue-500/20 pb-2">{t('blueTeam')}</div>
          <ul className="flex flex-col gap-1.5 items-start sm:items-end">
            {match.team_b_players.map(id => (
              <li key={id} className="text-gray-700 dark:text-gray-300 font-medium">
                {getPlayerName(id)}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <TimelineViewer
        timeline={match.match_events}
        matchStartTime={match.created_at}
        playerNames={playerNames}
      />
    </div>
  )
}
