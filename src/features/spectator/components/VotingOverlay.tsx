'use client'

import { PlayerWithStatus } from '@/lib/matchmaking'

type VotingOverlayProps = {
  votingState: 'idle' | 'voting' | 'voted'
  votingTeam: 'a' | 'b' | null
  countdown: number
  teamPlayers: PlayerWithStatus[]
  voteCounts: Map<string, number>
  myVote: string | null
  castVote: (playerId: string, playerName: string) => void
  toastMessage: string | null
}

export default function VotingOverlay({
  votingState,
  votingTeam,
  countdown,
  teamPlayers,
  voteCounts,
  myVote,
  castVote,
  toastMessage
}: VotingOverlayProps) {
  if (votingState === 'idle' || !votingTeam) return null

  return (
    <div className="absolute bottom-0 left-0 w-full bg-gray-950 border-t border-gray-800 p-4 z-40 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-full duration-300">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-black text-lg text-white">
          🏐 Who scored for <span className={votingTeam === 'a' ? 'text-red-500' : 'text-blue-500'}>{votingTeam === 'a' ? 'RED' : 'BLUE'}</span>?
        </h3>
        <div className="text-sm font-mono text-gray-400 bg-gray-900 px-2 py-1 rounded">
          {countdown}s ⏱
        </div>
      </div>
      
      <div className="flex flex-col gap-2">
        {teamPlayers.map((p: PlayerWithStatus | undefined) => {
          if (!p) return null
          const votes = voteCounts.get(p.id) || 0
          const isMyVote = myVote === p.id
          return (
            <button
              key={p.id}
              onClick={() => castVote(p.id, p.name)}
              disabled={votingState === 'voted'}
              className={`flex justify-between items-center p-3 rounded-xl transition ${
                isMyVote 
                  ? (votingTeam === 'a' ? 'bg-red-900/40 border border-red-500' : 'bg-blue-900/40 border border-blue-500')
                  : 'bg-gray-800 hover:bg-gray-700 border border-transparent'
              } ${votingState === 'voted' && !isMyVote ? 'opacity-50 grayscale' : ''}`}
            >
              <span className="font-bold text-white">{p.name} {isMyVote && '✓'}</span>
              <span className="text-sm font-bold text-gray-400 bg-gray-900 px-2 py-1 rounded">
                {votes} {votes === 1 ? 'vote' : 'votes'}
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
