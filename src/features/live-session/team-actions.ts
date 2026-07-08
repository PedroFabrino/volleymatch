'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { assertAuthenticated } from '@/types/action-error'
import type { PlayerPosition } from '@/types/player'
import {
  getMatchTeamsAndPositions,
  updateMatchTeams,
  updateMatchPositions,
  insertMatchEvent,
  getMatchForTeamSwap,
  swapMatchTeams,
  getMatchEvents,
  upsertMatchEvents,
  parsePositionRecord,
} from '@/lib/services'

export async function substitutePlayer(matchId: string, sessionId: string, team: 'a' | 'b', playerOutId: string, playerInId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  assertAuthenticated(user)

  const match = await getMatchTeamsAndPositions(supabase, matchId)
  if (!match) return

  let newTeamA = match.team_a_players
  let newTeamB = match.team_b_players
  let newPositionsA = parsePositionRecord(match.team_a_positions)
  let newPositionsB = parsePositionRecord(match.team_b_positions)

  let filledPosition: PlayerPosition = 'Any'

  if (team === 'a') {
    newTeamA = newTeamA.filter(id => id !== playerOutId)
    newTeamA.push(playerInId)
    filledPosition = newPositionsA[playerOutId] || 'Any'
    delete newPositionsA[playerOutId]
    newPositionsA[playerInId] = filledPosition
  } else {
    newTeamB = newTeamB.filter(id => id !== playerOutId)
    newTeamB.push(playerInId)
    filledPosition = newPositionsB[playerOutId] || 'Any'
    delete newPositionsB[playerOutId]
    newPositionsB[playerInId] = filledPosition
  }

  await updateMatchTeams(supabase, matchId, {
    team_a_players: newTeamA,
    team_b_players: newTeamB,
    team_a_positions: newPositionsA,
    team_b_positions: newPositionsB,
  })

  const { error } = await insertMatchEvent(supabase, {
    match_id: matchId,
    event_type: 'substitution',
    team,
    player_out_id: playerOutId,
    player_in_id: playerInId,
    filled_position: filledPosition,
  })

  if (error) {
    console.error('FAILED TO INSERT SUB EVENT:', error)
  }
}

export async function swapPositions(matchId: string, sessionId: string, playerAId: string, playerBId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  assertAuthenticated(user)

  const match = await getMatchTeamsAndPositions(supabase, matchId)
  if (!match) return

  const newPositionsA = { ...parsePositionRecord(match.team_a_positions) }
  const newPositionsB = { ...parsePositionRecord(match.team_b_positions) }

  const aOnTeamA = match.team_a_players.includes(playerAId)
  const bOnTeamA = match.team_a_players.includes(playerBId)

  const posA = aOnTeamA ? newPositionsA[playerAId] : newPositionsB[playerAId]
  const posB = bOnTeamA ? newPositionsA[playerBId] : newPositionsB[playerBId]

  if (aOnTeamA) newPositionsA[playerAId] = posB
  else newPositionsB[playerAId] = posB

  if (bOnTeamA) newPositionsA[playerBId] = posA
  else newPositionsB[playerBId] = posA

  await updateMatchPositions(supabase, matchId, newPositionsA, newPositionsB)

  await insertMatchEvent(supabase, {
    match_id: matchId,
    event_type: 'position_swap',
    team: aOnTeamA ? 'a' : 'b',
    player_out_id: playerAId,
    player_in_id: playerBId,
    filled_position: posA ?? 'Any',
  })
}

export async function swapTeams(matchId: string, sessionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  assertAuthenticated(user)

  const match = await getMatchForTeamSwap(supabase, matchId)
  if (!match) return

  await swapMatchTeams(supabase, matchId, {
    team_a_players: match.team_a_players,
    team_b_players: match.team_b_players,
    team_a_positions: parsePositionRecord(match.team_a_positions),
    team_b_positions: parsePositionRecord(match.team_b_positions),
    team_a_score: match.team_a_score,
    team_b_score: match.team_b_score,
  })

  const events = await getMatchEvents(supabase, matchId)
  if (events.length > 0) {
    const swappedEvents = events.map(e => ({
      ...e,
      team: e.team === 'a' ? 'b' : (e.team === 'b' ? 'a' : e.team),
      score_a: e.score_b !== null ? e.score_b : e.score_a,
      score_b: e.score_a !== null ? e.score_a : e.score_b,
    }))
    await upsertMatchEvents(supabase, swappedEvents)
  }

  revalidatePath(`/dashboard/live/${sessionId}`, 'page')
}
