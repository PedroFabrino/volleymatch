'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Session, Match } from '@/types'
import { PlayerWithStatus } from '@/lib/matchmaking'
import { useSpectatorScoreboard } from '../hooks'
import {
  SpectatorScorePanel,
  SpectatorRosterPanel,
  SpectatorQueuePanel,
  VotingOverlay,
} from './SpectatorPanels'

export default function SpectatorScoreboard({
  session,
  match,
  playersWithStatus,
  onVotingPendingChange,
}: {
  session: Session
  match: Match
  playersWithStatus: PlayerWithStatus[]
  onVotingPendingChange?: (pending: boolean) => void
}) {
  const t = useTranslations('Scoreboard')
  const {
    teamsOpen,
    setTeamsOpen,
    queueOpen,
    setQueueOpen,
    elapsed,
    votingState,
    votingTeam,
    countdown,
    voteCounts,
    myVote,
    toastMessage,
    castVote,
    dismissCurrentPrompt,
    queueLength,
    optScoreA,
    optScoreB,
    showMatchDoneOverlay,
    hasPendingVoting,
    teamAPlayers,
    teamBPlayers,
    benchPlayers,
  } = useSpectatorScoreboard(session, match, playersWithStatus)

  useEffect(() => {
    onVotingPendingChange?.(hasPendingVoting)
  }, [hasPendingVoting, onVotingPendingChange])

  return (
    <div className="flex flex-col h-[80vh] bg-gray-900 overflow-hidden relative rounded-3xl border border-gray-800 shadow-2xl">
      <SpectatorScorePanel
        elapsed={elapsed}
        targetScore={session.target_score}
        scoreA={optScoreA}
        scoreB={optScoreB}
      />

      <SpectatorRosterPanel
        teamsOpen={teamsOpen}
        setTeamsOpen={setTeamsOpen}
        teamAPlayers={teamAPlayers}
        teamBPlayers={teamBPlayers}
        teamAPositions={match.team_a_positions}
        teamBPositions={match.team_b_positions}
      />

      <SpectatorQueuePanel
        queueOpen={queueOpen}
        setQueueOpen={setQueueOpen}
        benchPlayers={benchPlayers}
        matchmakingMode={session.matchmaking_mode}
      />

      {showMatchDoneOverlay && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm overflow-hidden flex flex-col items-center p-8 shadow-2xl">
            <h2 className="text-4xl font-black text-white mb-2 text-center uppercase tracking-wider">
              {t('matchDone')}
            </h2>
            <div className="flex items-center gap-4 text-3xl font-black mb-8">
              <span className="text-red-500">{optScoreA}</span>
              <span className="text-gray-500">-</span>
              <span className="text-blue-500">{optScoreB}</span>
            </div>
            <p className="text-gray-400 text-center animate-pulse">{t('waitingHost')}</p>
          </div>
        </div>
      )}

      <VotingOverlay
        votingState={votingState}
        votingTeam={votingTeam}
        countdown={countdown}
        queueLength={queueLength}
        teamPlayers={votingTeam === 'a' ? teamAPlayers : teamBPlayers}
        voteCounts={voteCounts}
        myVote={myVote}
        castVote={castVote}
        onDone={dismissCurrentPrompt}
        toastMessage={toastMessage}
      />
    </div>
  )
}
