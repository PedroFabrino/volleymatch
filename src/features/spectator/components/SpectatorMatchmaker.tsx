'use client'

import { useMemo } from 'react'
import { RefreshCw } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { buildNextTeamPreview } from '@/lib/matchmaking'
import type { PlayerWithStatus } from '@/lib/matchmaking'
import type { Session } from '@/types/session'
import SpectatorQueuePanel from './SpectatorQueuePanel'

export default function SpectatorMatchmaker({
  session,
  playersWithStatus,
  lastMatchWinningTeamIds,
  lastMatchLosingTeamIds,
}: {
  session: Session
  playersWithStatus: PlayerWithStatus[]
  lastMatchWinningTeamIds: string[]
  lastMatchLosingTeamIds: string[]
}) {
  const t = useTranslations('Scoreboard')

  const nextTeamPreview = useMemo(() => {
    const players = playersWithStatus.map(({ draftStatus, draftedPosition, positionSlotFill, ...player }) => player)
    return buildNextTeamPreview(
      players,
      lastMatchWinningTeamIds,
      lastMatchLosingTeamIds,
      session.matchmaking_mode === 'strict',
      false,
    )
  }, [playersWithStatus, lastMatchWinningTeamIds, lastMatchLosingTeamIds, session.matchmaking_mode])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
      <div className="bg-gray-800 rounded-3xl max-w-xl w-full shadow-2xl border border-gray-700 text-left overflow-hidden">
        <div className="text-center p-8 pb-4">
          <RefreshCw className="w-16 h-16 mx-auto text-blue-500 mb-6 animate-spin" />
          <h2 className="text-2xl font-black mb-2 text-white">{t('draftingNextMatch')}</h2>
          <p className="text-gray-400">{t('waitingHostStart')}</p>
        </div>

        <div className="min-h-[280px]">
          <SpectatorQueuePanel
            queueOpen
            setQueueOpen={() => {}}
            nextTeamPreview={nextTeamPreview}
          />
        </div>
      </div>
    </div>
  )
}
