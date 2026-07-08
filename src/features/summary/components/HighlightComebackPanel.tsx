'use client'

import { useTranslations } from 'next-intl'
import { Match } from '@/types/match'

type Props = {
  biggestComebackMatch: Match
  turningPoint: { winningScore: number; losingScore: number }
  getPlayerNames: (teamIds: string[]) => string
}

export default function HighlightComebackPanel({
  biggestComebackMatch,
  turningPoint,
  getPlayerNames,
}: Props) {
  const t = useTranslations('Summary')

  const winningTeamIds =
    biggestComebackMatch.team_a_score > biggestComebackMatch.team_b_score
      ? biggestComebackMatch.team_a_players
      : biggestComebackMatch.team_b_players

  return (
    <>
      <div className="text-white/90 font-bold text-xl mb-1">
        {t('down', {
          losing: turningPoint.losingScore,
          winning: turningPoint.winningScore,
        })}
      </div>
      <div className="text-5xl font-black mb-8 leading-tight">
        {t('ralliedToWin', {
          scoreA: Math.max(
            biggestComebackMatch.team_a_score,
            biggestComebackMatch.team_b_score
          ),
          scoreB: Math.min(
            biggestComebackMatch.team_a_score,
            biggestComebackMatch.team_b_score
          ),
        })}
      </div>
      <div className="bg-red-900/30 rounded-2xl p-4 border border-red-500/30 backdrop-blur-md">
        <div className="text-xs text-red-200 uppercase font-bold tracking-widest mb-1">
          {t('comebackKids')}
        </div>
        <div className="font-bold text-lg leading-snug">{getPlayerNames(winningTeamIds)}</div>
      </div>
    </>
  )
}
