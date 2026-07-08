'use client'

import { ChevronDown, ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { PlayerWithStatus } from '@/lib/matchmaking'
import { sortPlayersByPos } from '@/utils/sortPlayersByPos'
import { PlayerRosterRow } from '@/components/PlayerRosterRow'

type SpectatorRosterPanelProps = {
  teamsOpen: boolean
  setTeamsOpen: (open: boolean) => void
  teamAPlayers: PlayerWithStatus[]
  teamBPlayers: PlayerWithStatus[]
  teamAPositions?: Record<string, string>
  teamBPositions?: Record<string, string>
}

export default function SpectatorRosterPanel({
  teamsOpen,
  setTeamsOpen,
  teamAPlayers,
  teamBPlayers,
  teamAPositions,
  teamBPositions
}: SpectatorRosterPanelProps) {
  const t = useTranslations('Scoreboard')

  return (
    <div className="bg-gray-900 shrink-0 border-b border-gray-800 z-10 shadow-md">
      <button 
        onClick={() => setTeamsOpen(!teamsOpen)}
        className="w-full flex justify-between items-center p-4 text-gray-400 hover:text-gray-200 transition-colors"
      >
        <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
          {teamsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          {t('liveMatchRosters')}
        </h3>
        <span className="text-xs bg-gray-800 px-2 py-1 rounded">{t('playersCount', { count: 12 })}</span>
      </button>
      
      {teamsOpen && (
        <div className="flex flex-row w-full bg-gray-900 border-t border-gray-800">
          
          {/* Team A Roster */}
          <div className="flex-1 p-4 border-r border-gray-800 max-h-[35vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700">
            <div className="flex justify-between items-center border-b border-red-900/50 pb-2 mb-3">
              <h3 className="text-red-500 font-black text-lg uppercase tracking-wide">{t('redTeam')}</h3>
            </div>
            <ul className="flex flex-col gap-2">
              {sortPlayersByPos(teamAPlayers, teamAPositions).map((p: PlayerWithStatus) => (
                <PlayerRosterRow
                  key={p.id}
                  player={p}
                  position={teamAPositions?.[p.id]}
                  team="a"
                  isSpectatorMode={true}
                />
              ))}
            </ul>
          </div>

          {/* Team B Roster */}
          <div className="flex-1 p-4 pb-4 max-h-[35vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700">
            <div className="flex justify-between items-center border-b border-blue-900/50 pb-2 mb-3">
              <h3 className="text-blue-500 font-black text-lg uppercase tracking-wide">{t('blueTeam')}</h3>
            </div>
            <ul className="flex flex-col gap-2">
              {sortPlayersByPos(teamBPlayers, teamBPositions).map((p: PlayerWithStatus) => (
                <PlayerRosterRow
                  key={p.id}
                  player={p}
                  position={teamBPositions?.[p.id]}
                  team="b"
                  isSpectatorMode={true}
                />
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
