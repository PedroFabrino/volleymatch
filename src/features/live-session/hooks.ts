import { useState } from 'react'
import type { PlayerWithStatus } from '@/lib/matchmaking'
import type { Session, Match, Player } from '@/types'
import { sortPlayersByPos } from '@/utils/sortPlayersByPos'
import { resolveTeamPlayers } from '@/utils/resolveTeamPlayers'
import { useScoreboardTimer } from './useScoreboardTimer'
import { useScoreboardVotes } from './useScoreboardVotes'
import { useScoreboardActions } from './useScoreboardActions'

export function useScoreboard(
  session: Session,
  match: Match,
  players: Player[],
  playersWithStatus: PlayerWithStatus[]
) {
  const elapsed = useScoreboardTimer(match.created_at)
  const toastMessage = useScoreboardVotes(session.id, players)
  const actions = useScoreboardActions(match, session.id)

  const [showTeamARoster, setShowTeamARoster] = useState(true)
  const [showTeamBRoster, setShowTeamBRoster] = useState(true)
  const [showQueue, setShowQueue] = useState(true)

  const { optScoreA, optScoreB } = actions

  let currentTarget = session.target_score
  let isMatchOver = false

  if (session.tie_breaker_rule === 'flat_plus_3') {
    if (optScoreA >= session.target_score - 1 && optScoreB >= session.target_score - 1) {
      currentTarget = session.target_score + 2
    }
    isMatchOver = optScoreA >= currentTarget || optScoreB >= currentTarget
  } else {
    const reachedTarget = optScoreA >= session.target_score || optScoreB >= session.target_score
    const diff = Math.abs(optScoreA - optScoreB)
    isMatchOver = reachedTarget && diff >= 2
  }

  const teamAPlayers = resolveTeamPlayers(match.team_a_players, players)
  const teamBPlayers = resolveTeamPlayers(match.team_b_players, players)
  const benchedPlayers = players.filter(
    p => p.is_present_today && !match.team_a_players.includes(p.id) && !match.team_b_players.includes(p.id)
  )

  const playingIds = new Set([...match.team_a_players, ...match.team_b_players])
  const queuedPlayers = playersWithStatus.filter(p => !playingIds.has(p.id))

  const sortedQueuedPlayers = [...queuedPlayers].sort((a, b) => {
    if (a.draftStatus === 'in_next_match' && b.draftStatus !== 'in_next_match') return -1
    if (a.draftStatus !== 'in_next_match' && b.draftStatus === 'in_next_match') return 1
    return 0
  })

  const sortedTeamA = sortPlayersByPos(teamAPlayers, match.team_a_positions)
  const sortedTeamB = sortPlayersByPos(teamBPlayers, match.team_b_positions)

  return {
    ...actions,
    elapsed,
    toastMessage,
    showTeamARoster,
    setShowTeamARoster,
    showTeamBRoster,
    setShowTeamBRoster,
    showQueue,
    setShowQueue,
    currentTarget,
    isMatchOver,
    benchedPlayers,
    sortedQueuedPlayers,
    sortedTeamA,
    sortedTeamB,
  }
}
