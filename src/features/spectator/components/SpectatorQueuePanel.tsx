'use client'

import { ChevronDown, ChevronRight, Clock, Loader2, Info } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { PlayerWithStatus } from '@/lib/matchmaking'

type SpectatorQueuePanelProps = {
  queueOpen: boolean
  setQueueOpen: (open: boolean) => void
  benchPlayers: PlayerWithStatus[]
  matchmakingMode: string | undefined
}

export default function SpectatorQueuePanel({
  queueOpen,
  setQueueOpen,
  benchPlayers,
  matchmakingMode
}: SpectatorQueuePanelProps) {
  const t = useTranslations('Scoreboard')
  const posT = useTranslations('Positions')

  return (
    <div className="bg-gray-950 flex-1 flex flex-col min-h-0 relative">
      <button 
        onClick={() => setQueueOpen(!queueOpen)}
        className="w-full flex justify-between items-center p-4 text-gray-400 hover:text-gray-200 transition-colors border-b border-gray-900 shadow-sm shrink-0"
      >
        <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
          {queueOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          {t('upNextQueue')}
        </h3>
        <span className="text-xs bg-gray-800 px-2 py-1 rounded">{t('playersCount', { count: benchPlayers.length })}</span>
      </button>
      
      {queueOpen && (
        <div className="flex flex-col gap-2 p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800 flex-1">
          {benchPlayers.map((p) => {
            let statusIcon = '🕐';
            let statusColor = 'border-gray-700 bg-gray-900 opacity-60';
            
            if (p.draftStatus === 'in_next_match') {
              statusIcon = '✅';
              statusColor = 'border-green-600 bg-green-900/30';
            } else if (p.draftStatus === 'position_conflict') {
              statusIcon = '⚠️';
              statusColor = 'border-amber-600/50 bg-amber-900/20 opacity-70';
            }

            return (
              <div key={p.id} className={`flex justify-between items-center rounded-lg px-3 py-2 border ${statusColor}`}>
                <div className="flex items-center gap-3">
                  <span className="text-sm">{statusIcon}</span>
                  <span className="font-bold text-gray-200 text-sm truncate">{p.name}</span>
                </div>
                
                <div className="flex items-center gap-3">
                  {matchmakingMode === 'strict' && (
                    <div className="flex flex-col gap-1 items-end ml-2">
                      {p.draftStatus === 'in_next_match' && p.draftedPosition === 'Any' && (
                        <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                          {t('any')}
                        </span>
                      )}
                      
                      {p.positionSlotFill && p.positionSlotFill.length > 0 && (
                        (p.draftStatus === 'in_next_match' && p.draftedPosition !== 'Any'
                          ? p.positionSlotFill.filter(f => f.position === p.draftedPosition)
                          : p.positionSlotFill
                        ).map(fill => (
                          <div key={fill.position} className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                              {posT(fill.position)}
                            </span>
                            <div className="flex gap-0.5">
                              {Array.from({ length: fill.total }).map((_, i) => (
                                <div 
                                  key={i} 
                                  className={`w-1.5 h-1.5 rounded-full ${i < fill.filled ? 'bg-amber-500/70' : 'bg-gray-700'}`}
                                />
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          {benchPlayers.length === 0 && (
            <div className="text-gray-500 text-sm italic">{t('noBench')}</div>
          )}
        </div>
      )}
    </div>
  )
}
