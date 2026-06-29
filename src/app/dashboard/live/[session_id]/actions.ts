'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { draftTeams, draftStrictTeams } from '@/utils/matchmaking'
import { calculateMmrChanges } from '@/utils/mmr'

export async function generateMatch(sessionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Get Session Details to know mode
  const { data: session } = await supabase.from('sessions').select('*').eq('id', sessionId).single()
  if (!session) return

  // 1. Get all players present today
  const { data: presentPlayers } = await supabase
    .from('players')
    .select('*')
    .eq('hoster_id', user.id)
    .eq('is_present_today', true)
    
  if (!presentPlayers || presentPlayers.length < 2) return

  // Merge games_played from session_players
  const { data: sessionPlayers } = await supabase
    .from('session_players')
    .select('player_id, games_played')
    .eq('session_id', sessionId)
    
  const sessionPlayersMap = new Map(sessionPlayers?.map(sp => [sp.player_id, sp.games_played]))
  
  for (const p of presentPlayers) {
    p.games_played_today = sessionPlayersMap.get(p.id) ?? 0
  }

  const mode = session.matchmaking_mode || 'casual'

  if (mode === 'strict') {
    // We need to know who won the last match
    const { data: lastMatch } = await supabase
      .from('matches')
      .select('team_a_players, team_b_players, team_a_score, team_b_score')
      .eq('session_id', sessionId)
      .eq('is_completed', true)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle()

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
        // Draw, just dump them all as losers so they get lower priority than queue
        lastMatchLosingTeamIds = [...lastMatch.team_a_players, ...lastMatch.team_b_players]
      }
    }

    const draft = draftStrictTeams(presentPlayers, lastMatchWinningTeamIds, lastMatchLosingTeamIds)
    return draft
  }

  // Casual Mode
  // 2. Determine who plays next (Hybrid Winner Stays On Logic)
  // For MVP: Simply sort by games_played_today (ascending) to guarantee rotation, then by MMR to balance.
  // We will take up to 12 players to form the match.
  const playersToDraft = [...presentPlayers].sort((a, b) => {
    if (a.games_played_today !== b.games_played_today) {
      return a.games_played_today - b.games_played_today
    }
    // If they have played the same amount, sort randomly for now to mix teams, or by MMR.
    return Math.random() - 0.5
  }).slice(0, 12)

  const { teamA, teamB } = draftTeams(playersToDraft)

  // Return the match draft instead of saving
  return { teamA, teamB }
}

export async function saveMatch(sessionId: string, teamA: string[], teamB: string[], teamAPositions?: any, teamBPositions?: any) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase.from('matches').insert({
    session_id: sessionId,
    hoster_id: user.id,
    team_a_players: teamA,
    team_b_players: teamB,
    team_a_score: 0,
    team_b_score: 0,
    team_a_positions: teamAPositions || {},
    team_b_positions: teamBPositions || {},
    is_completed: false
  })

  if (error) {
    console.error("FAILED TO INSERT MATCH", error)
    throw new Error(error.message)
  }

  revalidatePath(`/dashboard/live/${sessionId}`)
}

export async function updateScore(matchId: string, sessionId: string, team: 'a' | 'b', increment: number) {
  const supabase = await createClient()
  
  // Fetch current score
  const { data: match } = await supabase.from('matches').select('team_a_score, team_b_score').eq('id', matchId).single()
  if (!match) return

  const newScoreA = team === 'a' ? Math.max(0, match.team_a_score + increment) : match.team_a_score
  const newScoreB = team === 'b' ? Math.max(0, match.team_b_score + increment) : match.team_b_score

  await supabase.from('matches').update({
    team_a_score: newScoreA,
    team_b_score: newScoreB,
  }).eq('id', matchId)
  
  const { error } = await supabase.from('match_events').insert({
    match_id: matchId,
    event_type: 'score',
    team,
    increment,
    score_a: newScoreA,
    score_b: newScoreB
  })

  if (error) {
    console.error("FAILED TO INSERT MATCH EVENT:", error)
  }

  revalidatePath(`/dashboard/live/${sessionId}`)
}

export async function finishMatch(matchId: string, sessionId: string, destination: 'draft' | 'attendance' = 'attendance') {
  const supabase = await createClient()
  
  const { data: match } = await supabase.from('matches').select('*').eq('id', matchId).single()
  if (!match) return

  if (match.is_completed) {
    if (destination === 'draft') revalidatePath(`/dashboard/live/${sessionId}`, 'page')
    else { revalidatePath(`/dashboard/session`, 'page'); redirect(`/dashboard/session`) }
    return
  }

  // Fetch timeline from match_events
  const { data: events } = await supabase.from('match_events').select('*').eq('match_id', matchId).order('created_at', { ascending: true })
  
  // Convert DB events back to PointEvent format for mmr.ts
  const timeline = (events || []).map(e => ({
    team: e.team,
    increment: e.increment,
    scoreA: e.score_a,
    scoreB: e.score_b,
    timestamp: e.created_at,
    type: e.event_type,
    playerOutId: e.player_out_id,
    playerInId: e.player_in_id,
    filledPosition: e.filled_position
  }))

  await supabase.from('matches').update({ 
    is_completed: true,
    completed_at: new Date().toISOString()
  }).eq('id', matchId)

  const playerRecords: Record<string, any> = {}
  const allParticipatingPlayers = new Set([...match.team_a_players, ...match.team_b_players]);
  
  for (const e of timeline) {
    if (e.type === 'substitution') {
      if (e.playerOutId) allParticipatingPlayers.add(e.playerOutId);
      if (e.playerInId) allParticipatingPlayers.add(e.playerInId);
    }
  }

  for (const pid of allParticipatingPlayers) {
    const { data: p } = await supabase.from('players').select('mmr, id, positions').eq('id', pid).single()
    const { data: sp } = await supabase.from('session_players').select('games_played').eq('player_id', pid).eq('session_id', sessionId).maybeSingle()
    if (p) playerRecords[p.id] = { id: p.id, mmr: p.mmr, games_played_today: sp?.games_played ?? 0, positions: p.positions }
  }

  const mmrUpdates = calculateMmrChanges({
    team_a_players: match.team_a_players,
    team_b_players: match.team_b_players,
    team_a_positions: match.team_a_positions,
    team_b_positions: match.team_b_positions,
    team_a_score: match.team_a_score,
    team_b_score: match.team_b_score,
    point_timeline: timeline as any
  }, playerRecords)

  for (const update of mmrUpdates) {
    await supabase.from('players').update({ 
      mmr: update.newMmr
    }).eq('id', update.playerId)

    const { error: upsertError } = await supabase.from('session_players').upsert({
      session_id: sessionId,
      player_id: update.playerId,
      games_played: playerRecords[update.playerId].games_played_today + update.queueIncrement
    }, { onConflict: 'session_id, player_id' })
    
    if (upsertError) {
      console.error("FAILED TO UPSERT SESSION PLAYER:", upsertError)
    }
  }

  if (destination === 'draft') {
    revalidatePath(`/dashboard/live/${sessionId}`, 'page')
  } else {
    revalidatePath(`/dashboard/session`, 'page')
    redirect(`/dashboard/session`)
  }
}

export async function cancelMatch(matchId: string, sessionId: string) {
  const supabase = await createClient()
  await supabase.from('matches').delete().eq('id', matchId)
  revalidatePath(`/dashboard/session`, 'page')
  redirect(`/dashboard/session`)
}

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

  revalidatePath(`/dashboard/live/${sessionId}`)
}
