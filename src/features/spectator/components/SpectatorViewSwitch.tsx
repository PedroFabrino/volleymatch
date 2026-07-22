'use client'

import { useEffect, useState } from 'react'
import type { Session, Match } from '@/types'
import type { PlayerWithStatus } from '@/lib/matchmaking'
import {
  clearRetainedMatch,
  loadRetainedMatch,
  loadStoredQueue,
  saveRetainedMatch,
} from '../spectator-voting-storage'
import SpectatorScoreboard from './SpectatorScoreboard'
import SpectatorMatchmaker from './SpectatorMatchmaker'

type SpectatorViewSwitchProps = {
  session: Session
  activeMatch: Match | null
  playersWithStatus: PlayerWithStatus[]
  lastMatchWinningTeamIds: string[]
  lastMatchLosingTeamIds: string[]
}

function resolveInitialMatch(sessionId: string, activeMatch: Match | null) {
  return activeMatch ?? loadRetainedMatch(sessionId)
}

function resolveInitialPendingVoting(sessionId: string, activeMatch: Match | null) {
  const match = activeMatch ?? loadRetainedMatch(sessionId)
  if (!match) return false
  return loadStoredQueue(match.id).length > 0
}

export default function SpectatorViewSwitch({
  session,
  activeMatch,
  playersWithStatus,
  lastMatchWinningTeamIds,
  lastMatchLosingTeamIds,
}: SpectatorViewSwitchProps) {
  const [retainedMatch, setRetainedMatch] = useState<Match | null>(() =>
    resolveInitialMatch(session.id, activeMatch)
  )
  const [hasPendingVoting, setHasPendingVoting] = useState(() =>
    resolveInitialPendingVoting(session.id, activeMatch)
  )

  const [prevActiveMatch, setPrevActiveMatch] = useState(activeMatch)
  if (activeMatch !== prevActiveMatch) {
    setPrevActiveMatch(activeMatch)
    if (activeMatch) {
      saveRetainedMatch(session.id, activeMatch)
      setRetainedMatch(activeMatch)
    }
  }

  const [prevHasPendingVoting, setPrevHasPendingVoting] = useState(hasPendingVoting)
  if (hasPendingVoting !== prevHasPendingVoting) {
    setPrevHasPendingVoting(hasPendingVoting)
    if (!hasPendingVoting && !activeMatch) {
      clearRetainedMatch(session.id)
      setRetainedMatch(null)
    }
  }

  const scoreboardMatch = activeMatch ?? retainedMatch
  const showScoreboard = Boolean(activeMatch) || Boolean(retainedMatch && hasPendingVoting)

  if (showScoreboard && scoreboardMatch) {
    return (
      <SpectatorScoreboard
        session={session}
        match={scoreboardMatch}
        playersWithStatus={playersWithStatus}
        onVotingPendingChange={setHasPendingVoting}
      />
    )
  }

  return (
    <SpectatorMatchmaker
      session={session}
      playersWithStatus={playersWithStatus}
      lastMatchWinningTeamIds={lastMatchWinningTeamIds}
      lastMatchLosingTeamIds={lastMatchLosingTeamIds}
    />
  )
}
