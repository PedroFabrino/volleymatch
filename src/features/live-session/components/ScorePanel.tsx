'use client'

import { Minus } from 'lucide-react'
import { useTranslations } from 'next-intl'

type ScorePanelProps = {
  teamLabel: 'a' | 'b'
  score: number
  onIncrement: () => void
  onDecrement: (e: React.MouseEvent) => void
  onTouchStart: (e: React.TouchEvent) => void
  onTouchEnd: (e: React.TouchEvent) => void
}

export function ScorePanel({
  teamLabel,
  score,
  onIncrement,
  onDecrement,
  onTouchStart,
  onTouchEnd
}: ScorePanelProps) {
  const t = useTranslations('Scoreboard')
  const isTeamA = teamLabel === 'a'
  const bgColor = isTeamA ? 'bg-red-600' : 'bg-blue-600'
  const activeBgColor = isTeamA ? 'active:bg-red-700' : 'active:bg-blue-700'

  return (
    <div 
      data-testid={`score-panel-${teamLabel}`}
      className={`relative flex-1 flex items-center justify-center ${bgColor} ${activeBgColor} transition-colors cursor-pointer select-none touch-none`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onClick={onIncrement}
    >
      <div data-testid={`score-value-${teamLabel}`} className="landscape:text-[40vh] portrait:text-[20vh] font-black text-white leading-none pt-4">
        {score}
      </div>
      <button 
        data-testid={`decrement-${teamLabel}`}
        onClick={onDecrement}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/20 hover:bg-black/40 text-white p-3 rounded-full md:hidden landscape:flex z-20 pointer-events-auto"
        title={t('decreaseScore')}
      >
        <Minus className="w-6 h-6" />
      </button>
    </div>
  )
}
