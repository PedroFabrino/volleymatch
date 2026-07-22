'use client'

import { Clock } from 'lucide-react'
import { useTranslations } from 'next-intl'

type SpectatorScorePanelProps = {
  elapsed: string
  targetScore: number
  scoreA: number
  scoreB: number
}

export default function SpectatorScorePanel({
  elapsed,
  targetScore,
  scoreA,
  scoreB
}: SpectatorScorePanelProps) {
  const t = useTranslations('Scoreboard')

  return (
    <div className="relative flex flex-row w-full portrait:aspect-[2/1] landscape:h-[35vh] shrink-0 border-b border-gray-800 shadow-lg z-20">
      
      {/* Top Bar Overlay */}
      <div className="flex justify-between items-center p-4 bg-gray-950/60 absolute w-full top-0 z-10 text-white font-mono uppercase tracking-widest text-xs font-bold pointer-events-none">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full"><Clock className="w-4 h-4 text-blue-400" /> {elapsed}</span>
        </div>
        <div>{t('target')} {targetScore}</div>
      </div>

      {/* Team A (Red) */}
      <div className="relative flex-1 flex items-center justify-center bg-red-600">
        <div className="portrait:text-[15vw] landscape:text-[20vh] font-black text-white leading-none pt-4">
          {scoreA}
        </div>
      </div>

      {/* Divider */}
      <div className="h-full w-2 bg-gray-950 z-10" />

      {/* Team B (Blue) */}
      <div className="relative flex-1 flex items-center justify-center bg-blue-600">
        <div className="portrait:text-[15vw] landscape:text-[20vh] font-black text-white leading-none pt-4">
          {scoreB}
        </div>
      </div>
    </div>
  )
}
