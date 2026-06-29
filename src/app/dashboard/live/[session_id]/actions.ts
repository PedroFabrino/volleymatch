'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function generateMatch(sessionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // 1. Get all players present today
  const { data: presentPlayers } = await supabase
    .from('players')
    .select('*')
    .eq('hoster_id', user.id)
    .eq('is_present_today', true)
    
  if (!presentPlayers || presentPlayers.length < 2) return

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

  // 3. Draft the 12 players into 2 teams based on MMR (Snake Draft approximation)
  playersToDraft.sort((a, b) => b.mmr - a.mmr)

  const teamA: string[] = []
  const teamB: string[] = []
  let teamAMmr = 0
  let teamBMmr = 0

  // Setter Compensation Logic
  const isSetter = (p: any) => {
    const pos = p.active_positions && p.active_positions.length > 0 ? p.active_positions : p.positions
    return pos?.includes('Setter') || false
  }

  const setters = playersToDraft.filter(isSetter)
  let teamAMissingSetter = false
  let teamBMissingSetter = false

  if (setters.length === 1) {
    // Give the only setter to Team A, Team B gets compensation
    teamA.push(setters[0].id)
    teamAMmr += setters[0].mmr
    playersToDraft.splice(playersToDraft.indexOf(setters[0]), 1)
    teamBMissingSetter = true
  }

  for (const player of playersToDraft) {
    // Apply 10% penalty to the calculated MMR of a team missing a setter
    // This tricks the draft into giving them a better player to compensate
    const effectiveTeamAMmr = teamAMissingSetter ? teamAMmr * 0.9 : teamAMmr
    const effectiveTeamBMmr = teamBMissingSetter ? teamBMmr * 0.9 : teamBMmr

    if (effectiveTeamAMmr <= effectiveTeamBMmr && teamA.length < 6) {
      teamA.push(player.id)
      teamAMmr += player.mmr
    } else if (teamB.length < 6) {
      teamB.push(player.id)
      teamBMmr += player.mmr
    } else {
      teamA.push(player.id)
      teamAMmr += player.mmr
    }
  }

  // 4. Create the match
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
  
  // Fetch current score
  const { data: match } = await supabase.from('matches').select('team_a_score, team_b_score').eq('id', matchId).single()
  if (!match) return

  const updatePayload = team === 'a' 
    ? { team_a_score: Math.max(0, match.team_a_score + increment) }
    : { team_b_score: Math.max(0, match.team_b_score + increment) }

  await supabase.from('matches').update(updatePayload).eq('id', matchId)
  revalidatePath(`/dashboard/live/${sessionId}`)
}

export async function finishMatch(matchId: string, sessionId: string) {
  const supabase = await createClient()
  
  const { data: match } = await supabase.from('matches').select('*').eq('id', matchId).single()
  if (!match) return

  // 1. Mark match as completed
  await supabase.from('matches').update({ is_completed: true }).eq('id', matchId)

  // 2. Increment games_played_today for all participants
  const allPlayers = [...match.team_a_players, ...match.team_b_players]
  for (const pid of allPlayers) {
    const { data: p } = await supabase.from('players').select('games_played_today').eq('id', pid).single()
    if (p) {
      await supabase.from('players').update({ games_played_today: p.games_played_today + 1 }).eq('id', pid)
    }
  }

  // (Future Step: Update MMR here)

  revalidatePath(`/dashboard/live/${sessionId}`)
}

export async function cancelMatch(matchId: string, sessionId: string) {
  const supabase = await createClient()
  
  // Just delete the match so it acts like it never happened
  await supabase.from('matches').delete().eq('id', matchId)
  
  revalidatePath(`/dashboard/live/${sessionId}`)
}
