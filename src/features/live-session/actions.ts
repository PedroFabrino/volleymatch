'use server'

import { createClient } from '@/lib/supabase/server'
import { after } from 'next/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { computeMatchDraft, processBackgroundMatch } from './_draft'

export async function generateMatch(sessionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  return await computeMatchDraft(supabase, sessionId, user.id)
}

export async function saveMatch(sessionId: string, teamA: string[], teamB: string[], teamAPositions?: Record<string, string>, teamBPositions?: Record<string, string>) {
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


