'use client'

import { ArrowLeftRight } from 'lucide-react'
import { useTranslations } from 'next-intl'

type AdminControlsProps = {
  isMatchOver: boolean
  isPending: boolean
  onCancel: (e: React.MouseEvent) => void
  onSwapTeams: (e: React.MouseEvent) => void
  onFinishEarly: (e: React.MouseEvent) => void
}

export function AdminControls({
  isMatchOver,
  isPending,
  onCancel,
  onSwapTeams,
  onFinishEarly
}: AdminControlsProps) {
  const t = useTranslations('Scoreboard')
  
  return (
    <div className="absolute bottom-4 left-0 w-full flex justify-center gap-4 px-4 z-20 pointer-events-none">
      <div className="flex gap-4 pointer-events-auto">
        <button 
          onClick={onCancel}
          className="bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-800/50 px-4 py-2 rounded-full font-bold text-sm shadow-lg backdrop-blur-sm transition-colors"
        >
          {t('cancelGame')}
        </button>

        <button 
          onClick={onSwapTeams}
          disabled={isPending}
          className="bg-gray-800/80 hover:bg-gray-700 text-gray-300 border border-gray-600/50 px-4 py-2 rounded-full font-bold text-sm shadow-lg backdrop-blur-sm transition-colors flex items-center gap-2 disabled:opacity-50"
          title="Swap Sides"
        >
          <ArrowLeftRight className="w-4 h-4" /> Swap Sides
        </button>
        
        {!isMatchOver && (
          <button 
            onClick={onFinishEarly}
            className="bg-gray-900/80 hover:bg-gray-800 text-gray-300 border border-gray-700/50 px-4 py-2 rounded-full font-bold text-sm shadow-lg backdrop-blur-sm transition-colors"
          >
            {t('finishEarly')}
          </button>
        )}
      </div>
    </div>
  )
}
