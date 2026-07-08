'use client'

import { useTranslations } from 'next-intl'
import { Match } from '@/types/match'

type Props = {
  biggestDiffMatch: Match
  maxDiff: number
  getPlayerNames: (teamIds: string[]) => string
}

export default function HighlightBlowoutPanel({
  biggestDiffMatch,
  maxDiff,
  getPlayerNames,
}: Props) {
  const t = useTranslations('Summary')

  const winningTeamIds =
    biggestDiffMatch.team_a_score > biggestDiffMatch.team_b_score
      ? biggestDiffMatch.team_a_players
      : biggestDiffMatch.team_b_players

  return (
    <>
      <div className="text-white/90 font-bold text-xl mb-1">{t('totalDominance')}</div>
      <div className="text-5xl font-black mb-8 leading-tight">
        {t('wonBy', { diff: maxDiff })}
      </div>
      <div className="bg-indigo-900/30 rounded-2xl p-4 border border-indigo-500/30 backdrop-blur-md">
        <div className="text-xs text-indigo-200 uppercase font-bold tracking-widest mb-1">
          {t('unstoppables')}
        </div>
        <div className="font-bold text-lg leading-snug">{getPlayerNames(winningTeamIds)}</div>
      </div>
    </>
  )
}
