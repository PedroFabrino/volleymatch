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

    const { teamA, teamB } = draftStrictTeams(presentPlayers, lastMatchWinningTeamIds, lastMatchLosingTeamIds)
    return { teamA, teamB }
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

export async function saveMatch(sessionId: string, teamA: string[], teamB: string[]) {
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
  
  // Fetch current score and timeline
  const { data: match } = await supabase.from('matches').select('team_a_score, team_b_score, point_timeline').eq('id', matchId).single()
  if (!match) return

  const newScoreA = team === 'a' ? Math.max(0, match.team_a_score + increment) : match.team_a_score
  const newScoreB = team === 'b' ? Math.max(0, match.team_b_score + increment) : match.team_b_score

  const timeline = match.point_timeline || []
  timeline.push({
    team,
    increment,
    scoreA: newScoreA,
    scoreB: newScoreB,
    timestamp: new Date().toISOString()
  })

  await supabase.from('matches').update({
    team_a_score: newScoreA,
    team_b_score: newScoreB,
    point_timeline: timeline
  }).eq('id', matchId)
  
  revalidatePath(`/dashboard/live/${sessionId}`)
}

export async function finishMatch(matchId: string, sessionId: string, destination: 'draft' | 'attendance' = 'attendance') {
  const supabase = await createClient()
  
  const { data: match } = await supabase.from('matches').select('*').eq('id', matchId).single()
  if (!match) return

  // Prevent double counting if they clicked the button multiple times
  if (match.is_completed) {
    if (destination === 'draft') {
      revalidatePath(`/dashboard/live/${sessionId}`, 'page')
    } else {
      revalidatePath(`/dashboard/session`, 'page')
      redirect(`/dashboard/session`)
    }
    return
  }

  // 1. Mark match as completed and set completed_at
  await supabase.from('matches').update({ 
    is_completed: true,
    completed_at: new Date().toISOString()
  }).eq('id', matchId)

  // 2. Increment games_played_today for all participants
  const allPlayers = [...match.team_a_players, ...match.team_b_players]
  const playerRecords: Record<string, any> = {}

  for (const pid of allPlayers) {
    const { data: p } = await supabase.from('players').select('games_played_today, mmr, id').eq('id', pid).single()
    if (p) {
      playerRecords[p.id] = { id: p.id, mmr: p.mmr }
      await supabase.from('players').update({ games_played_today: p.games_played_today + 1 }).eq('id', pid)
    }
  }

  // 3. Update MMR
  const mmrUpdates = calculateMmrChanges({
    team_a_players: match.team_a_players,
    team_b_players: match.team_b_players,
    team_a_score: match.team_a_score,
    team_b_score: match.team_b_score,
    point_timeline: match.point_timeline || []
  }, playerRecords)

  for (const update of mmrUpdates) {
    await supabase.from('players').update({ mmr: update.newMmr }).eq('id', update.playerId)
  }

  if (destination === 'draft') {
    revalidatePath(`/dashboard/live/${sessionId}`, 'page')
    // No redirect needed, revalidating the live page will naturally show the Matchmaker because is_completed is true now
  } else {
    revalidatePath(`/dashboard/session`, 'page')
    redirect(`/dashboard/session`)
  }
}

export async function cancelMatch(matchId: string, sessionId: string) {
  const supabase = await createClient()
  
  // Just delete the match so it acts like it never happened
  await supabase.from('matches').delete().eq('id', matchId)
  
  revalidatePath(`/dashboard/session`, 'page')
  redirect(`/dashboard/session`)
}

export async function substitutePlayer(matchId: string, sessionId: string, team: 'a' | 'b', playerOutId: string, playerInId: string) {
  const supabase = await createClient()
  
  const { data: match } = await supabase.from('matches').select('team_a_players, team_b_players, point_timeline').eq('id', matchId).single()
  if (!match) return

  let newTeamA = match.team_a_players
  let newTeamB = match.team_b_players

  if (team === 'a') {
    newTeamA = newTeamA.filter((id: string) => id !== playerOutId)
    newTeamA.push(playerInId)
  } else {
    newTeamB = newTeamB.filter((id: string) => id !== playerOutId)
    newTeamB.push(playerInId)
  }

  const timeline = match.point_timeline || []
  timeline.push({
    type: 'substitution',
    team,
    playerOutId,
    playerInId,
    timestamp: new Date().toISOString()
  })

  await supabase.from('matches').update({
    team_a_players: newTeamA,
    team_b_players: newTeamB,
    point_timeline: timeline
  }).eq('id', matchId)

  revalidatePath(`/dashboard/live/${sessionId}`)
}
