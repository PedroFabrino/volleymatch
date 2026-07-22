'use client'

import { useTranslations } from 'next-intl'

type MatchOverModalProps = {
  scoreA: number
  scoreB: number
  isPending: boolean
  onDraftNext: () => void
  onBackToAttendance: () => void
  onUndoPoint: () => void
}

export function MatchOverModal({
  scoreA,
  scoreB,
  isPending,
  onDraftNext,
  onBackToAttendance,
  onUndoPoint
}: MatchOverModalProps) {
  const t = useTranslations('Scoreboard')

  return (
    <div data-testid="match-over-modal" className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm overflow-hidden flex flex-col items-center p-8 shadow-2xl">
        <h2 className="text-4xl font-black text-white mb-2 text-center uppercase tracking-wider">
          {t('matchDone')}
        </h2>
        <div className="flex items-center gap-4 text-3xl font-black mb-8">
          <span className="text-red-500">{scoreA}</span>
          <span className="text-gray-500">-</span>
          <span className="text-blue-500">{scoreB}</span>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <button 
            onClick={onDraftNext}
            disabled={isPending}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition shadow-lg disabled:opacity-50"
          >
            {t('draftNext')}
          </button>
          <button 
            onClick={onBackToAttendance}
            disabled={isPending}
            className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold py-4 rounded-xl transition disabled:opacity-50"
          >
            {t('backToAttendance')}
          </button>
          
          <div className="mt-4 pt-4 border-t border-gray-800 w-full">
            <button 
              data-testid="undo-point-btn"
              onClick={onUndoPoint}
              disabled={isPending}
              className="w-full bg-transparent text-gray-500 hover:text-gray-300 font-bold py-2 transition disabled:opacity-50"
            >
              {t('undoPoint')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
