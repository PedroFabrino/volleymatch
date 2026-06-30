'use client'

import { Trophy, RefreshCw } from 'lucide-react'

import { PlayerWithStatus } from '@/utils/matchmaking'
import { useTranslations } from 'next-intl'

export default function SpectatorMatchmaker({ session, playersWithStatus }: { session: any, playersWithStatus: PlayerWithStatus[] }) {
  const t = useTranslations('Scoreboard')
  const posT = useTranslations('Positions')
  const playingNext = playersWithStatus.filter(p => p.draftStatus === 'in_next_match')
  const sittingOut = playersWithStatus.filter(p => p.draftStatus !== 'in_next_match')

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
      <div className="bg-gray-800 p-8 rounded-3xl max-w-xl w-full shadow-2xl border border-gray-700 text-left">
        <div className="text-center mb-8">
          <RefreshCw className="w-16 h-16 mx-auto text-blue-500 mb-6 animate-spin" />
          <h2 className="text-2xl font-black mb-2 text-white">Drafting Next Match</h2>
          <p className="text-gray-400">Waiting for the host to start the next game...</p>
        </div>
        
        {/* PLAYING NEXT SECTION */}
        <div className="mb-6">
          <h3 className="text-green-400 font-bold mb-3 flex justify-between">
            <span>✅ PLAYING NEXT</span>
            <span className="text-gray-400 text-sm font-normal">{playingNext.length} players</span>
          </h3>
          <div className="flex flex-col gap-2">
            {playingNext.map(p => (
              <div key={p.id} className="bg-gray-900 rounded-lg p-3 flex justify-between items-center">
                <span className="font-bold text-gray-100">{p.name}</span>
                {session.matchmaking_mode === 'strict' && (
                  <div className="flex flex-col gap-1 items-end ml-2">
                    {p.draftedPosition === 'Any' && (
                      <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider bg-gray-800 px-2 py-1 rounded">
                        {t('any')}
                      </span>
                    )}
                    
                    {p.positionSlotFill && p.positionSlotFill.length > 0 && p.draftedPosition !== 'Any' && (
                      p.positionSlotFill.filter(f => f.position === p.draftedPosition).map(fill => (
                        <div key={fill.position} className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                            {posT(fill.position as any)}
                          </span>
                          <div className="flex gap-0.5">
                            {Array.from({ length: fill.total }).map((_, i) => (
                              <div 
                                key={i} 
                                className={`w-2 h-2 rounded-full ${i < fill.filled ? 'bg-amber-500/70' : 'bg-gray-700'}`}
                              />
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
            {playingNext.length === 0 && <p className="text-gray-500 text-sm">No players assigned yet.</p>}
          </div>
        </div>

        {/* SITTING OUT SECTION */}
        <div>
          <h3 className="text-gray-400 font-bold mb-3 flex justify-between border-t border-gray-700 pt-6">
            <span>🕐 SITTING OUT</span>
            <span className="text-gray-500 text-sm font-normal">{sittingOut.length} players</span>
          </h3>
          <div className="flex flex-col gap-2">
            {sittingOut.map(p => (
              <div key={p.id} className="bg-gray-900/50 rounded-lg p-3 flex justify-between items-center opacity-80">
                  <span className="font-bold text-gray-200 text-sm truncate">{p.name}</span>
                
                <div className="flex items-center gap-3">
                  {session.matchmaking_mode === 'strict' && p.positionSlotFill && p.positionSlotFill.length > 0 && (
                    <div className="flex flex-col gap-1 items-end">
                      {p.positionSlotFill.map(fill => (
                        <div key={fill.position} className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                            {posT(fill.position as any)}
                          </span>
                          <div className="flex gap-0.5">
                            {Array.from({ length: fill.total }).map((_, i) => (
                              <div 
                                key={i} 
                                className={`w-2 h-2 rounded-full ${i < fill.filled ? 'bg-amber-500/70' : 'bg-gray-700'}`}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {sittingOut.length === 0 && <p className="text-gray-500 text-sm">Everyone is playing!</p>}
          </div>
        </div>

      </div>
    </div>
  )
}
