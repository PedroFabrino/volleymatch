'use client'

import { useTransition, useOptimistic, useState } from 'react'
import { batchToggleAttendance, toggleActivePosition } from './actions'
import { Check, X, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'

// Global debounce queue for attendance toggles across all player components
type AttendanceUpdate = { resolve: () => void, reject: (err: any) => void, payload: { playerId: string, isPresent: boolean, activeSessionId?: string } }
let attendanceQueue: AttendanceUpdate[] = [];
let debounceTimer: NodeJS.Timeout | null = null;

function enqueueAttendanceToggle(playerId: string, isPresent: boolean, activeSessionId?: string) {
  return new Promise<void>((resolve, reject) => {
    attendanceQueue.push({ resolve, reject, payload: { playerId, isPresent, activeSessionId } });
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      const items = [...attendanceQueue];
      attendanceQueue = [];
      try {
        await batchToggleAttendance(items.map(i => i.payload));
        items.forEach(i => i.resolve());
      } catch (err) {
        items.forEach(i => i.reject(err));
      }
    }, 400); // 400ms debounce
  });
}

export default function AttendanceToggle({ player, activeSessionId }: { player: any, activeSessionId?: string }) {
  const [isPending, startTransition] = useTransition()
  const [togglingPos, setTogglingPos] = useState<string | null>(null)
  const t = useTranslations('Positions')
  
  const [optimisticIsPresent, addOptimisticIsPresent] = useOptimistic(
    player.is_present_today,
    (state: boolean, newState: boolean) => newState
  )

  const defaultPositions = player.active_positions !== null 
    ? player.active_positions 
    : player.positions;

  const [optimisticPositions, addOptimisticPositions] = useOptimistic(
    defaultPositions || [],
    (state: string[], newPos: string) => 
      state.includes(newPos) ? state.filter(p => p !== newPos) : [...state, newPos]
  )

  const handlePositionToggle = (e: React.MouseEvent, pos: string) => {
    e.stopPropagation() // Prevent toggling the main attendance button
    setTogglingPos(pos)
    startTransition(() => {
      addOptimisticPositions(pos)
      toggleActivePosition(player.id, pos)
    })
  }

  // Reset toggling position if transition finished
  if (!isPending && togglingPos !== null) {
    setTogglingPos(null)
  }

  return (
    <div className={`flex flex-col w-full p-4 border rounded-xl transition-all ${
      optimisticIsPresent ? 'bg-green-50 border-green-200 shadow-sm dark:bg-green-900/20 dark:border-green-800' : 'bg-white hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-750'
    }`}>
      {/* Attendance Row */}
      <button 
        onClick={() => {
          startTransition(async () => {
            addOptimisticIsPresent(!optimisticIsPresent)
            await enqueueAttendanceToggle(player.id, !optimisticIsPresent, activeSessionId)
          })
        }}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex flex-col">
          <span className={`font-bold transition-colors ${optimisticIsPresent ? 'text-green-900 dark:text-green-100' : 'text-gray-900 dark:text-gray-100'}`}>
            {player.name}
          </span>
        </div>
        
        <div>
          {optimisticIsPresent ? (
            <div className="bg-green-500 text-white p-1 rounded-full transition-transform scale-100">
              <Check className="w-5 h-5" />
            </div>
          ) : (
            <div className="bg-gray-200 text-gray-500 p-1 rounded-full transition-transform scale-100 dark:bg-gray-700 dark:text-gray-400">
              <X className="w-5 h-5" />
            </div>
          )}
        </div>
      </button>

      {/* Positions Override Row */}
      {optimisticIsPresent && player.positions?.length > 0 && (
        <div className="mt-3 pt-3 border-t border-green-200/50 flex gap-2 flex-wrap">
          {player.positions.map((pos: string) => {
            const isActive = optimisticPositions.includes(pos)
            const isOnlyPosition = player.positions.length === 1
            const isLoading = isPending && togglingPos === pos
            
            return (
              <button
                key={pos}
                type="button"
                disabled={isOnlyPosition || isPending}
                onClick={(e) => {
                  if (!isOnlyPosition && !isPending) handlePositionToggle(e, pos)
                }}
                className={`relative flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full transition-colors ${
                  (isActive || isOnlyPosition)
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                } ${isOnlyPosition ? 'opacity-80 cursor-default' : 'cursor-pointer'} ${isLoading ? 'opacity-70' : ''}`}
              >
                {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                {t(pos as any)}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
