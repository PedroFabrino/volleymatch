'use client'

import { ChevronDown, ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { NextTeamPreview, NextTeamSlot } from '@/lib/matchmaking'

type SpectatorQueuePanelProps = {
  queueOpen: boolean
  setQueueOpen: (open: boolean) => void
  nextTeamPreview: NextTeamPreview
}

function TeamSlotList({
  slots,
  teamLabel,
  teamClass,
  posT,
  t,
}: {
  slots: NextTeamSlot[]
  teamLabel: string
  teamClass: string
  posT: (key: string) => string
  t: (key: string) => string
}) {
  return (
    <div className="flex flex-col gap-2">
      <h4 className={`text-xs font-black uppercase tracking-wider ${teamClass}`}>{teamLabel}</h4>
      {slots.map((slot, index) => (
        <div
          key={`${slot.position}-${index}`}
          className={`flex justify-between items-center rounded-lg px-3 py-2 border ${
            slot.isTbd
              ? 'border-gray-700 bg-gray-900/40 opacity-70'
              : 'border-green-700/40 bg-green-900/20'
          }`}
        >
          <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
            {slot.position === 'Any' ? t('any') : posT(slot.position)}
          </span>
          <span className={`font-bold text-sm truncate ml-3 ${slot.isTbd ? 'text-gray-500 italic' : 'text-gray-100'}`}>
            {slot.isTbd ? t('toBeDetermined') : slot.playerName}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function SpectatorQueuePanel({
  queueOpen,
  setQueueOpen,
  nextTeamPreview,
}: SpectatorQueuePanelProps) {
  const t = useTranslations('Scoreboard')
  const posT = useTranslations('Positions')

  const filledCount = [...nextTeamPreview.teamA, ...nextTeamPreview.teamB].filter(slot => !slot.isTbd).length
  const totalSlots = nextTeamPreview.targetSize * 2

  return (
    <div className="bg-gray-950 flex-1 flex flex-col min-h-0 relative">
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
        <div className="flex flex-col gap-4 p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800 flex-1">
          <TeamSlotList
            slots={nextTeamPreview.teamA}
            teamLabel={t('teamRedShort')}
            teamClass="text-red-500"
            posT={posT}
            t={t}
          />
          <TeamSlotList
            slots={nextTeamPreview.teamB}
            teamLabel={t('teamBlueShort')}
            teamClass="text-blue-500"
            posT={posT}
            t={t}
          />
          {filledCount === 0 && (
            <div className="text-gray-500 text-sm italic">{t('nextTeamEmpty')}</div>
          )}
        </div>
      )}
    </div>
  )
}
