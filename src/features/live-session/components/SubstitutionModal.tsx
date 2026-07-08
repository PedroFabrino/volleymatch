'use client'

import { useTranslations } from 'next-intl'
import type { Player } from '@/types'

type SubstitutionModalProps = {
  subbingPlayer: { id: string; name: string; team: 'a' | 'b' }
  benchedPlayers: Player[]
  isPending: boolean
  onConfirm: (playerInId: string) => void
  onClose: () => void
}

export function SubstitutionModal({
  subbingPlayer,
  benchedPlayers,
  isPending,
  onConfirm,
  onClose
}: SubstitutionModalProps) {
  const t = useTranslations('Scoreboard')

  return (
    <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[80vh]">
        <div className="p-4 border-b border-gray-800">
          <h3 className="text-xl font-bold text-white text-center">{t('subOut', { name: subbingPlayer.name })}</h3>
          <p className="text-sm text-gray-400 text-center mt-1">{t('subSelect')}</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          {benchedPlayers.length === 0 ? (
            <p className="text-gray-500 text-center py-8">{t('noBench')}</p>
          ) : (
            benchedPlayers.map(p => (
              <button 
                key={p.id}
                onClick={() => onConfirm(p.id)}
                disabled={isPending}
                className="flex justify-between items-center bg-gray-800 p-4 rounded-xl hover:bg-gray-700 transition disabled:opacity-50 w-full text-left"
              >
                <span className="font-bold text-white">{p.name}</span>
                <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">{t('subIn')}</span>
              </button>
            ))
          )}
        </div>

        <div className="p-4 border-t border-gray-800">
          <button 
            onClick={onClose}
            className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-xl transition"
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}
