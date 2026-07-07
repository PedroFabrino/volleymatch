'use server'

import { createClient } from '@/utils/supabase/server'
import { after } from 'next/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { draftTeams, draftStrictTeams } from '@/utils/matchmaking'
import { calculateMmrChanges } from '@/utils/mmr'

export async function generateMatch(sessionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  return await computeMatchDraft(supabase, sessionId, user.id)
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

  // Pre-calc next draft immediately after starting a new match
  const draft = await computeMatchDraft(supabase, sessionId, user.id)
  await supabase.from('sessions').update({ pending_draft: draft ?? null }).eq('id', sessionId)

  revalidatePath(`/dashboard/live/${sessionId}`)
}

export async function updateScore(matchId: string, sessionId: string, team: 'a' | 'b', increment: number) {
  const supabase = await createClient()
  
  const { data: match } = await supabase.from('matches').select('team_a_score, team_b_score').eq('id', matchId).single()
  if (!match) return

  const newScoreA = team === 'a' ? Math.max(0, match.team_a_score + increment) : match.team_a_score
  const newScoreB = team === 'b' ? Math.max(0, match.team_b_score + increment) : match.team_b_score

  // Fire both writes concurrently — do not await sequentially
  const scoreUpdate = supabase.from('matches').update({
    team_a_score: newScoreA,
    team_b_score: newScoreB,
  }).eq('id', matchId)

  const eventInsert = supabase.from('match_events').insert({
    match_id: matchId,
    event_type: 'score',
    team,
    increment,
    score_a: newScoreA,
    score_b: newScoreB
  })

  const [, { error }] = await Promise.all([scoreUpdate, eventInsert])

  if (error) {
    console.error("FAILED TO INSERT MATCH EVENT:", error)
  }
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

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Fast path: mark match done immediately
  await supabase.from('matches').update({ 
    is_completed: true,
    completed_at: new Date().toISOString()
  }).eq('id', matchId)

  // Compute next draft instantly (using current MMR, which is extremely fast)
  const draft = await computeMatchDraft(supabase, sessionId, user.id)
  await supabase.from('sessions').update({ pending_draft: draft ?? null }).eq('id', sessionId)

  // Fire background processing without making an HTTP request to avoid dev server deadlocks
  after(() => {
    processBackgroundMatch(matchId, sessionId, user.id).catch(err => console.error('Background finish-match failed:', err))
  });

  if (destination === 'draft') {
    revalidatePath(`/dashboard/live/${sessionId}`, 'page')
    // Client redirects instantly — background job fills in the draft
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

// Helper to pre-compute the next draft without persisting it.
// Returns the exact object that would normally be returned by generateMatch.
async function computeMatchDraft(supabase: any, sessionId: string, userId: string) {
  // Run these three independent queries in parallel
  const [
    { data: session },
    { data: presentPlayers },
    { data: sessionPlayers }
  ] = await Promise.all([
    supabase.from('sessions').select('*').eq('id', sessionId).single(),
    supabase.from('players').select('*').eq('hoster_id', userId).eq('is_present_today', true),
    supabase.from('session_players').select('player_id, games_played').eq('session_id', sessionId)
  ])

  if (!session) return null
  if (!presentPlayers || presentPlayers.length < 2) return null
    
  const sessionPlayersMap = new Map((sessionPlayers ?? []).map((sp: { player_id: string, games_played: number }) => [sp.player_id, sp.games_played]))
  
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
  const playersToDraft = [...presentPlayers].sort((a, b) => {
    if (a.games_played_today !== b.games_played_today) {
      return a.games_played_today - b.games_played_today
    }
    // If they have played the same amount, sort randomly for now to mix teams, or by MMR.
    return Math.random() - 0.5
  }).slice(0, 12)

  const { teamA, teamB } = draftTeams(playersToDraft)

  return { teamA, teamB }
}

// --- Background Job Logic ---
// Run in Node event loop instead of an HTTP route to avoid Next.js DEV server serialization blocking
async function processBackgroundMatch(matchId: string, sessionId: string, userId: string) {
  const supabase = await createClient()

  const { data: match } = await supabase.from('matches').select('*').eq('id', matchId).single()
  if (!match) return

  const { data: events } = await supabase.from('match_events').select('*').eq('match_id', matchId).order('created_at', { ascending: true })
  
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

  const playerRecords: Record<string, any> = {}
  const allParticipatingPlayers = new Set([...match.team_a_players, ...match.team_b_players]);
  
  for (const e of timeline) {
    if (e.type === 'substitution') {
      if (e.playerOutId) allParticipatingPlayers.add(e.playerOutId);
      if (e.playerInId) allParticipatingPlayers.add(e.playerInId);
    }
  }

  // Optimize player fetching
  const { data: pData } = await supabase.from('players').select('mmr, id, positions').in('id', Array.from(allParticipatingPlayers))
  const { data: spData } = await supabase.from('session_players').select('player_id, games_played').eq('session_id', sessionId).in('player_id', Array.from(allParticipatingPlayers))
  
  const spMap = new Map((spData || []).map(sp => [sp.player_id, sp.games_played]))

  if (pData) {
    for (const p of pData) {
      playerRecords[p.id] = { id: p.id, mmr: p.mmr, games_played_today: spMap.get(p.id) ?? 0, positions: p.positions }
    }
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

  // Use a single upsert instead of 12 for session_players
  const sessionPlayersDataToUpsert = mmrUpdates.map((update: any) => ({
    session_id: sessionId,
    player_id: update.playerId,
    games_played: playerRecords[update.playerId].games_played_today + update.queueIncrement
  }))

  const historyInserts = mmrUpdates.map((update: any) => ({
    player_id: update.playerId,
    hoster_id: userId,
    match_id: matchId,
    session_id: sessionId,
    old_mmr: update.oldMmr,
    new_mmr: update.newMmr,
    mmr_change: update.mmrChange,
    reason: 'match_result'
  }))

  const playerUpdates = mmrUpdates.map((update: any) =>
    supabase.from('players').update({ mmr: update.newMmr }).eq('id', update.playerId)
  )

  await Promise.all([
    ...playerUpdates,
    sessionPlayersDataToUpsert.length > 0 ? supabase.from('session_players').upsert(sessionPlayersDataToUpsert, { onConflict: 'session_id, player_id' }) : Promise.resolve(),
    historyInserts.length > 0 ? supabase.from('mmr_history').insert(historyInserts) : Promise.resolve()
  ])
}
