'use client'

import { ChevronDown, ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { NextTeamPreview, NextTeamSlot } from '@/lib/matchmaking'
import { PlayerRosterRow } from '@/components/PlayerRosterRow'
import { sortNextTeamSlots } from '@/utils/sortPlayersByPos'
import type { PlayerPosition } from '@/types/player'

type SpectatorQueuePanelProps = {
  queueOpen: boolean
  setQueueOpen: (open: boolean) => void
  nextTeamPreview: NextTeamPreview
}

function NextTeamColumn({
  slots,
  team,
  teamTitle,
  teamHeaderClass,
  borderClass,
  t,
}: {
  slots: NextTeamSlot[]
  team: 'a' | 'b'
  teamTitle: string
  teamHeaderClass: string
  borderClass: string
  t: (key: string) => string
}) {
  const sortedSlots = sortNextTeamSlots(slots)

  return (
    <div className={`flex-1 p-4 max-h-[35vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 ${borderClass}`}>
      <div className={`flex justify-between items-center border-b pb-2 mb-3 ${team === 'a' ? 'border-red-900/50' : 'border-blue-900/50'}`}>
        <h3 className={`${teamHeaderClass} font-black text-lg uppercase tracking-wide`}>{teamTitle}</h3>
      </div>
      <ul className="flex flex-col gap-2">
        {sortedSlots.map((slot, index) => (
          <PlayerRosterRow
            key={`${slot.position}-${slot.playerId ?? 'tbd'}-${index}`}
            player={
              slot.isTbd
                ? { id: `tbd-${team}-${index}`, name: t('toBeDetermined'), positions: [slot.position] }
                : { id: slot.playerId!, name: slot.playerName!, positions: [slot.position] }
            }
            position={slot.position === 'Any' ? undefined : slot.position as PlayerPosition}
            team={team}
            isSpectatorMode
            isTbd={slot.isTbd}
          />
        ))}
      </ul>
    </div>
  )
}

export default function SpectatorQueuePanel({
  queueOpen,
  setQueueOpen,
  nextTeamPreview,
}: SpectatorQueuePanelProps) {
  const t = useTranslations('Scoreboard')

  const filledCount = [...nextTeamPreview.teamA, ...nextTeamPreview.teamB].filter(slot => !slot.isTbd).length
  const totalSlots = nextTeamPreview.targetSize * 2

  return (
    <div className="bg-gray-950 flex-1 flex flex-col min-h-0 relative shrink-0 border-t border-gray-800">
      <button
        type="button"
        onClick={() => setQueueOpen(!queueOpen)}
        className="w-full flex justify-between items-center p-4 text-gray-400 hover:text-gray-200 transition-colors border-b border-gray-900 shadow-sm shrink-0"
      >
        <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
          {queueOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          {t('nextTeam')}
        </h3>
        <span className="text-xs bg-gray-800 px-2 py-1 rounded">
          {t('nextTeamFilled', { filled: filledCount, total: totalSlots })}
        </span>
      </button>

      {queueOpen && (
        <div className="flex flex-row w-full bg-gray-950 flex-1 min-h-0">
          <NextTeamColumn
            slots={nextTeamPreview.teamA}
            team="a"
            teamTitle={t('redTeam')}
            teamHeaderClass="text-red-500"
            borderClass="border-r border-gray-800"
            t={t}
          />
          <NextTeamColumn
            slots={nextTeamPreview.teamB}
            team="b"
            teamTitle={t('blueTeam')}
            teamHeaderClass="text-blue-500"
            borderClass=""
            t={t}
          />
        </div>
      )}
    </div>
  )
}
