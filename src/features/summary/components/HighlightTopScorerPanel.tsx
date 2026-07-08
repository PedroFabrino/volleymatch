'use client'

import { useTranslations } from 'next-intl'

type Props = {
  topScorer: { id: string; name: string; points: number }
}

export default function HighlightTopScorerPanel({ topScorer }: Props) {
  const t = useTranslations('Summary')

  return (
    <>
      <div className="text-white/90 font-bold text-xl mb-1">{t('offensiveMachine')}</div>
      <div className="text-5xl font-black mb-8 leading-tight">{topScorer.name}</div>
      <div className="bg-green-900/30 rounded-2xl p-4 border border-green-500/30 backdrop-blur-md">
        <div className="text-xs text-emerald-200 uppercase font-bold tracking-widest mb-1">
          {t('pointsScored')}
        </div>
        <div className="font-bold text-lg leading-snug">
          {topScorer.points} {t('points', { count: topScorer.points })}
        </div>
      </div>
    </>
  )
}
