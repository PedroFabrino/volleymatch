// src/features/live-session/_draft.ts
// PRIVATE — do not export from index.ts

import { createClient } from '@/lib/supabase/server'
import { draftTeams, draftStrictTeams } from '@/lib/matchmaking'
import { calculateMmrChanges } from '@/lib/mmr'
import { SupabaseClient } from '@supabase/supabase-js'

// Helper to pre-compute the next draft without persisting it.
// Returns the exact object that would normally be returned by generateMatch.
export async function computeMatchDraft(supabase: SupabaseClient, sessionId: string, userId: string) {
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
export async function processBackgroundMatch(matchId: string, sessionId: string, userId: string) {
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
