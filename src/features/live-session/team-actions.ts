'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function substitutePlayer(matchId: string, sessionId: string, team: 'a' | 'b', playerOutId: string, playerInId: string) {
  const supabase = await createClient()
  
  const { data: match } = await supabase.from('matches').select('team_a_players, team_b_players, team_a_positions, team_b_positions').eq('id', matchId).single()
  if (!match) return

  let newTeamA = match.team_a_players
  let newTeamB = match.team_b_players
  let newPositionsA = match.team_a_positions || {}
  let newPositionsB = match.team_b_positions || {}
  
  let filledPosition = 'Any';

  if (team === 'a') {
    newTeamA = newTeamA.filter((id: string) => id !== playerOutId)
    newTeamA.push(playerInId)
    filledPosition = newPositionsA[playerOutId] || 'Any'
    delete newPositionsA[playerOutId]
    newPositionsA[playerInId] = filledPosition
  } else {
    newTeamB = newTeamB.filter((id: string) => id !== playerOutId)
    newTeamB.push(playerInId)
    filledPosition = newPositionsB[playerOutId] || 'Any'
    delete newPositionsB[playerOutId]
    newPositionsB[playerInId] = filledPosition
  }

  await supabase.from('matches').update({
    team_a_players: newTeamA,
    team_b_players: newTeamB,
    team_a_positions: newPositionsA,
    team_b_positions: newPositionsB
  }).eq('id', matchId)

  const { error } = await supabase.from('match_events').insert({
    match_id: matchId,
    event_type: 'substitution',
    team,
    player_out_id: playerOutId,
    player_in_id: playerInId,
    filled_position: filledPosition
  })

  if (error) {
    console.error("FAILED TO INSERT SUB EVENT:", error)
  }
}

export async function swapPositions(matchId: string, sessionId: string, playerAId: string, playerBId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: match } = await supabase
    .from('matches')
    .select('team_a_players, team_b_players, team_a_positions, team_b_positions')
    .eq('id', matchId)
    .single()
  if (!match) return

  const newPositionsA = { ...(match.team_a_positions || {}) }
  const newPositionsB = { ...(match.team_b_positions || {}) }

  // Determine which team each player is on
  const aOnTeamA = match.team_a_players.includes(playerAId)
  const bOnTeamA = match.team_a_players.includes(playerBId)

  const posA = aOnTeamA ? newPositionsA[playerAId] : newPositionsB[playerAId]
  const posB = bOnTeamA ? newPositionsA[playerBId] : newPositionsB[playerBId]

  // Swap positions
  if (aOnTeamA) newPositionsA[playerAId] = posB
  else newPositionsB[playerAId] = posB

  if (bOnTeamA) newPositionsA[playerBId] = posA
  else newPositionsB[playerBId] = posA

  await supabase.from('matches').update({
    team_a_positions: newPositionsA,
    team_b_positions: newPositionsB,
  }).eq('id', matchId)

  await supabase.from('match_events').insert({
    match_id: matchId,
    event_type: 'position_swap',
    team: aOnTeamA ? 'a' : 'b',
    player_out_id: playerAId,
    player_in_id: playerBId,
    filled_position: posA ?? 'Any'
  })
}

export async function swapTeams(matchId: string, sessionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: match } = await supabase
    .from('matches')
    .select('team_a_players, team_b_players, team_a_positions, team_b_positions, team_a_score, team_b_score')
    .eq('id', matchId)
    .single()
    
  if (!match) return

  // 1. Swap the match state
  await supabase.from('matches').update({
    team_a_players: match.team_b_players,
    team_b_players: match.team_a_players,
    team_a_positions: match.team_b_positions,
    team_b_positions: match.team_a_positions,
    team_a_score: match.team_b_score,
    team_b_score: match.team_a_score
  }).eq('id', matchId)
  
  // 2. Swap all timeline events for this match
  const { data: events } = await supabase.from('match_events').select('*').eq('match_id', matchId)
  if (events && events.length > 0) {
    const swappedEvents = events.map(e => ({
      ...e,
      team: e.team === 'a' ? 'b' : (e.team === 'b' ? 'a' : e.team),
      score_a: e.score_b !== null ? e.score_b : e.score_a,
      score_b: e.score_a !== null ? e.score_a : e.score_b,
    }))
    await supabase.from('match_events').upsert(swappedEvents)
  }

  revalidatePath(`/dashboard/live/${sessionId}`, 'page')
}
