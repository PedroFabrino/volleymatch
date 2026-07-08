'use client'

import { useTranslations } from 'next-intl'
import { PlayerWithStatus } from '@/lib/matchmaking'

type VotingOverlayProps = {
  votingState: 'idle' | 'voting' | 'voted'
  votingTeam: 'a' | 'b' | null
  countdown: number
  queueLength: number
  teamPlayers: PlayerWithStatus[]
  voteCounts: Map<string, number>
  myVote: string | null
  castVote: (playerId: string, playerName: string) => void
  onDone: () => void
  toastMessage: string | null
}

export default function VotingOverlay({
  votingState,
  votingTeam,
  countdown,
  queueLength,
  teamPlayers,
  voteCounts,
  myVote,
  castVote,
  onDone,
  toastMessage,
}: VotingOverlayProps) {
  const t = useTranslations('Scoreboard')

  if (votingState === 'idle' || !votingTeam) return null

  const teamLabel = votingTeam === 'a' ? t('teamRedShort') : t('teamBlueShort')
  const teamClass = votingTeam === 'a' ? 'text-red-500' : 'text-blue-500'

  return (
    <div className="absolute bottom-0 left-0 w-full bg-gray-950 border-t border-gray-800 p-4 z-40 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-full duration-300">
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
          const votes = voteCounts.get(p.id) || 0
          const isMyVote = myVote === p.id
          const teamTone = votingTeam === 'a'
            ? 'bg-red-900/40 border-red-500'
            : 'bg-blue-900/40 border-blue-500'

          return (
            <button
              key={p.id}
              onClick={() => castVote(p.id, p.name)}
              disabled={votingState === 'voted'}
              className={`flex justify-between items-center p-3 rounded-xl transition ${
                isMyVote
                  ? `${teamTone} border`
                  : 'bg-gray-800 hover:bg-gray-700 border border-transparent'
              } ${votingState === 'voted' && !isMyVote ? 'opacity-50 grayscale' : ''}`}
            >
              <span className="font-bold text-white">{p.name} {isMyVote && '✓'}</span>
              <span className="text-sm font-bold text-gray-400 bg-gray-900 px-2 py-1 rounded">
                {t('voteCount', { count: votes })}
              </span>
            </button>
          )
        })}
      </div>

      {toastMessage && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[120%] bg-green-600 text-white font-bold px-4 py-2 rounded-full shadow-lg animate-in fade-in zoom-in duration-200">
          {toastMessage}
        </div>
      )}
    </div>
  )
}
