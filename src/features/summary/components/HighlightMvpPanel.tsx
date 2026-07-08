'use client'

import { TrendingUp } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { PlayerStat } from '@/types/player'

type Props = {
  mvp: PlayerStat
  bestPartner: { name: string; wins: number } | null
}

export default function HighlightMvpPanel({ mvp, bestPartner }: Props) {
  const t = useTranslations('Summary')

  return (
    <>
      <div className="text-5xl font-black mb-2 leading-tight">{mvp.name}</div>
      <div className="text-amber-100 flex items-center gap-2 font-black text-2xl mb-8">
        <TrendingUp className="w-8 h-8" />
        +{mvp.mmrChange} MMR
      </div>
      {bestPartner && (
        <div className="bg-amber-900/30 rounded-2xl p-4 border border-amber-500/30 backdrop-blur-md">
          <div className="text-xs text-amber-200 uppercase font-bold tracking-widest mb-1">
            {t('dynamicDuo')}
          </div>
          <div className="font-bold flex items-center justify-between text-lg">
            <span>{bestPartner.name}</span>
            <span className="text-amber-200">
              {t('winsTogether', { count: bestPartner.wins })}
            </span>
          </div>
        </div>
      )}
    </>
  )
}
