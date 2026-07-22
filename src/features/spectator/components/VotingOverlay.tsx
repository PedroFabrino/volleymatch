'use client'

import { useState, useEffect } from 'react'
import { ChevronUp } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { PlayerWithStatus } from '@/lib/matchmaking'
import { SCORING_TYPES, SCORING_TYPE_EMOJI } from '@/types/pointAttribution'
import type { ScoringType } from '@/types/pointAttribution'

type VotingOverlayProps = {
  votingState: 'idle' | 'voting' | 'voted'
  votingPhase: 'choose_player' | 'choose_type'
  votingTeam: 'a' | 'b' | null
  countdown: number
  queueLength: number
  teamPlayers: PlayerWithStatus[]
  voteCounts: Map<string, number>
  myVote: string | null
  selectedPlayerId: string | null
  selectedPlayerName: string | null
  selectedScoringType: ScoringType | null
  selectPlayer: (playerId: string, playerName: string) => void
  selectScoringType: (scoringType: ScoringType) => void
  onDone: () => void
  toastMessage: string | null
}

type PlayerVoteCardProps = {
  player: PlayerWithStatus
  isSelected: boolean
  isExpanded: boolean
  playerSelectionLocked: boolean
  votingState: VotingOverlayProps['votingState']
  selectedScoringType: ScoringType | null
  teamTone: string
  scoringTypeLabel: (type: ScoringType) => string
  voteCountLabel: string
  howDidScoreLabel: string
  onSelectPlayer: () => void
  onSelectScoringType: (type: ScoringType) => void
}

function PlayerVoteCard({
  player,
  isSelected,
  isExpanded,
  playerSelectionLocked,
  votingState,
  selectedScoringType,
  teamTone,
  scoringTypeLabel,
  voteCountLabel,
  howDidScoreLabel,
  onSelectPlayer,
  onSelectScoringType,
}: PlayerVoteCardProps) {
  const cardTone = isSelected
    ? `${teamTone} border`
    : 'bg-gray-800 border border-transparent'

  const dimmed = playerSelectionLocked && !isSelected

  return (
    <div
      className={`rounded-xl overflow-hidden transition-all duration-200 ${cardTone} ${
        dimmed ? 'opacity-50 grayscale' : ''
      } ${isExpanded ? 'shadow-lg' : ''}`}
    >
      <button
        type="button"
        onClick={onSelectPlayer}
        disabled={playerSelectionLocked}
        aria-expanded={isExpanded}
        className="flex w-full justify-between items-center p-3 text-left transition hover:bg-white/5 disabled:cursor-default"
      >
        <span className="font-bold text-white">
          {player.name}
          {isSelected && ' ✓'}
        </span>
        <span className="text-sm font-bold text-gray-400 bg-gray-900 px-2 py-1 rounded shrink-0">
          {voteCountLabel}
        </span>
      </button>

      <div
        className={`grid transition-all duration-200 ease-in-out ${
          isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-3 pb-3 pt-1 border-t border-white/10">
            <p className="text-gray-400 text-xs font-semibold mb-2">{howDidScoreLabel}</p>
            <div
              role="radiogroup"
              aria-label={howDidScoreLabel}
              className="grid grid-cols-2 gap-2"
            >
              {SCORING_TYPES.map((type) => {
                const isTypeSelected = selectedScoringType === type
                const isDisabled = votingState === 'voted'

                return (
                  <label
                    key={type}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition text-sm font-semibold ${
                      isTypeSelected
                        ? 'bg-green-900/40 border-green-500 text-green-300'
                        : 'bg-gray-900/80 border-gray-700 text-gray-200 hover:bg-gray-800'
                    } ${isDisabled && !isTypeSelected ? 'opacity-40 cursor-default' : ''}`}
                  >
                    <input
                      type="radio"
                      name={`scoring-type-${player.id}`}
                      value={type}
                      checked={isTypeSelected}
                      disabled={isDisabled}
                      onChange={() => onSelectScoringType(type)}
                      className="h-4 w-4 accent-green-500 shrink-0"
                    />
                    <span className="text-lg leading-none">{SCORING_TYPE_EMOJI[type]}</span>
                    <span className="truncate">{scoringTypeLabel(type)}</span>
                  </label>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function VotingOverlay({
  votingState,
  votingPhase,
  votingTeam,
  countdown,
  queueLength,
  teamPlayers,
  voteCounts,
  myVote,
  selectedPlayerId,
  selectedPlayerName,
  selectedScoringType,
  selectPlayer,
  selectScoringType,
  onDone,
  toastMessage,
}: VotingOverlayProps) {
  const t = useTranslations('Scoreboard')
  const [isMinimized, setIsMinimized] = useState(false)

  useEffect(() => {
    setIsMinimized(false)
  }, [votingTeam])

  if (votingState === 'idle' || !votingTeam) return null

  const teamLabel = votingTeam === 'a' ? t('teamRedShort') : t('teamBlueShort')
  const teamClass = votingTeam === 'a' ? 'text-red-500' : 'text-blue-500'
  const playerSelectionLocked = votingPhase === 'choose_type' || votingState === 'voted'
  const teamTone = votingTeam === 'a'
    ? 'bg-red-900/40 border-red-500'
    : 'bg-blue-900/40 border-blue-500'

  const scoringTypeLabel = (type: ScoringType) => {
    const labels: Record<ScoringType, string> = {
      spike: t('scoringTypeSpike'),
      block: t('scoringTypeBlock'),
      ace: t('scoringTypeAce'),
      other: t('scoringTypeOther'),
    }
    return labels[type]
  }

  const expandedPlayerName = selectedPlayerName ?? teamPlayers.find((p) => p?.id === selectedPlayerId)?.name

  if (isMinimized) {
    return (
      <div
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900/95 backdrop-blur-md border border-gray-700 text-white rounded-full px-4 py-2.5 shadow-2xl flex items-center gap-3 cursor-pointer animate-in slide-in-from-bottom-4 duration-200 hover:bg-gray-800"
      >
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${votingTeam === 'a' ? 'bg-red-500' : 'bg-blue-500'}`} />
          <span className="font-bold text-sm">
            {t('whoScoredForPrefix')} <span className={teamClass}>{teamLabel}</span>{t('whoScoredForSuffix')}
          </span>
        </div>
        <div className="text-xs font-mono text-gray-400 bg-gray-800 px-2 py-1 rounded-full border border-gray-700">
          {countdown}s
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setIsMinimized(false)
          }}
          className="text-xs font-bold text-blue-400 bg-blue-950/60 border border-blue-800/60 px-2.5 py-1 rounded-full hover:bg-blue-900 transition flex items-center gap-1"
        >
          <ChevronUp className="w-3.5 h-3.5" />
          {t('open') ?? 'Open'}
        </button>
      </div>
    )
  }

  return (
    <div
      onClick={() => setIsMinimized(true)}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md max-h-[85vh] overflow-y-auto bg-gray-950 border border-gray-800 p-5 rounded-3xl shadow-2xl relative animate-in zoom-in-95 duration-200"
      >
        <div className="flex justify-between items-center mb-4 gap-3">
          <div className="min-w-0">
            <h3 className="font-black text-lg text-white">
              {t('whoScoredForPrefix')}{' '}
              <span className={teamClass}>{teamLabel}</span>
              {t('whoScoredForSuffix')}
            </h3>
            {queueLength > 1 && (
              <p className="text-xs font-semibold text-gray-400 mt-1">
                {t('votingQueuePosition', { current: 1, total: queueLength })}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-sm font-mono text-gray-400 bg-gray-900 px-2 py-1 rounded">
              {t('votingCountdown', { seconds: countdown })}
            </div>
            <button
              type="button"
              onClick={onDone}
              className="text-sm font-bold text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 px-3 py-1 rounded transition"
            >
              {t('votingDone')}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {teamPlayers.map((p: PlayerWithStatus | undefined) => {
            if (!p) return null
            const isSelected = selectedPlayerId === p.id || myVote === p.id
            const isExpanded = isSelected && (votingPhase === 'choose_type' || votingState === 'voted')

            return (
              <PlayerVoteCard
                key={p.id}
                player={p}
                isSelected={isSelected}
                isExpanded={isExpanded}
                playerSelectionLocked={playerSelectionLocked}
                votingState={votingState}
                selectedScoringType={isSelected ? selectedScoringType : null}
                teamTone={teamTone}
                scoringTypeLabel={scoringTypeLabel}
                voteCountLabel={t('voteCount', { count: voteCounts.get(p.id) || 0 })}
                howDidScoreLabel={expandedPlayerName ? t('howDidScore', { name: expandedPlayerName }) : t('howDidScoreShort')}
                onSelectPlayer={() => selectPlayer(p.id, p.name)}
                onSelectScoringType={selectScoringType}
              />
            )
          })}
        </div>

        {toastMessage && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[120%] bg-green-600 text-white font-bold px-4 py-2 rounded-full shadow-lg animate-in fade-in zoom-in duration-200">
            {toastMessage}
          </div>
        )}
      </div>
    </div>
  )
}
