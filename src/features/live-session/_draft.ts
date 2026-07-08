// src/features/live-session/_draft.ts
// PRIVATE — do not export from index.ts

import { createClient } from '@/lib/supabase/server'
import { draftTeams, draftStrictTeams } from '@/lib/matchmaking'
import { calculateMmrChanges, PlayerData, PointEvent } from '@/lib/mmr'
import type { TypedSupabaseClient } from '@/types/supabase'
import {
  getDraftSessionData,
  getLastCompletedMatchWithScores,
  getMatchForProcessing,
  getMatchEventsOrdered,
  getPlayersMmrData,
  getSessionPlayersGames,
  applyMmrUpdates,
  parsePositionRecord,
} from '@/lib/services'

export async function computeMatchDraft(supabase: TypedSupabaseClient, sessionId: string, userId: string) {
  const { session, presentPlayers, sessionPlayers } = await getDraftSessionData(supabase, sessionId, userId)

  if (!session) return null
  if (!presentPlayers || presentPlayers.length < 2) return null

  const sessionPlayersMap = new Map((sessionPlayers ?? []).map(sp => [sp.player_id, sp.games_played]))

  for (const p of presentPlayers) {
    p.games_played_today = sessionPlayersMap.get(p.id) ?? 0
  }

  const mode = session.matchmaking_mode || 'casual'

  if (mode === 'strict') {
    const lastMatch = await getLastCompletedMatchWithScores(supabase, sessionId)

    let lastMatchWinningTeamIds: string[] = []
    let lastMatchLosingTeamIds: string[] = []

    if (lastMatch) {
      if (lastMatch.team_a_score > lastMatch.team_b_score) {
        lastMatchWinningTeamIds = lastMatch.team_a_players
        lastMatchLosingTeamIds = lastMatch.team_b_players
      } else if (lastMatch.team_b_score > lastMatch.team_a_score) {
        lastMatchWinningTeamIds = lastMatch.team_b_players
        lastMatchLosingTeamIds = lastMatch.team_a_players
      } else {
        lastMatchLosingTeamIds = [...lastMatch.team_a_players, ...lastMatch.team_b_players]
      }
    }

    return draftStrictTeams(presentPlayers, lastMatchWinningTeamIds, lastMatchLosingTeamIds)
  }

  const playersToDraft = [...presentPlayers].sort((a, b) => {
    if (a.games_played_today !== b.games_played_today) {
      return a.games_played_today - b.games_played_today
    }
    return Math.random() - 0.5
  }).slice(0, 12)

  const { teamA, teamB } = draftTeams(playersToDraft)

  return { teamA, teamB }
}

export async function processBackgroundMatch(matchId: string, sessionId: string, userId: string) {
  const supabase = await createClient()

  const match = await getMatchForProcessing(supabase, matchId)
  if (!match) return

  const events = await getMatchEventsOrdered(supabase, matchId)

  const timeline = events.map(e => ({
    team: e.team,
    increment: e.increment,
    scoreA: e.score_a,
    scoreB: e.score_b,
    timestamp: e.created_at,
    type: e.event_type,
    playerOutId: e.player_out_id,
    playerInId: e.player_in_id,
    filledPosition: e.filled_position,
  }))

  const playerRecords: Record<string, PlayerData & { games_played_today: number }> = {}
  const allParticipatingPlayers = new Set([...match.team_a_players, ...match.team_b_players])

  for (const e of timeline) {
    if (e.type === 'substitution') {
      if (e.playerOutId) allParticipatingPlayers.add(e.playerOutId)
      if (e.playerInId) allParticipatingPlayers.add(e.playerInId)
    }
  }

  const pData = await getPlayersMmrData(supabase, Array.from(allParticipatingPlayers))
  const spData = await getSessionPlayersGames(supabase, sessionId, Array.from(allParticipatingPlayers))

  const spMap = new Map(spData.map(sp => [sp.player_id, sp.games_played]))

  for (const p of pData) {
    playerRecords[p.id] = {
      id: p.id,
      mmr: p.mmr,
      games_played_today: spMap.get(p.id) ?? 0,
      positions: p.positions,
    }
  }

  const mmrUpdates = calculateMmrChanges({
    team_a_players: match.team_a_players,
    team_b_players: match.team_b_players,
    team_a_positions: parsePositionRecord(match.team_a_positions),
    team_b_positions: parsePositionRecord(match.team_b_positions),
    team_a_score: match.team_a_score,
    team_b_score: match.team_b_score,
    point_timeline: timeline as PointEvent[],
  }, playerRecords)

  const playerGamesMap: Record<string, number> = {}
  for (const update of mmrUpdates) {
    playerGamesMap[update.playerId] = playerRecords[update.playerId].games_played_today
  }

  await applyMmrUpdates(supabase, sessionId, userId, matchId, mmrUpdates, playerGamesMap)
}
