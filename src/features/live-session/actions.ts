'use server'

import { createClient } from '@/lib/supabase/server'
import { after } from 'next/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { ActionError, assertAuthenticated } from '@/types/action-error'
import {
  insertMatch,
  getMatchScores,
  updateMatchScores,
  getMatchById,
  completeMatch,
  deleteMatch,
  updatePendingDraft,
} from '@/lib/services'
import { computeMatchDraft, processBackgroundMatch } from './_draft'

export async function generateMatch(sessionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  assertAuthenticated(user)

  return await computeMatchDraft(supabase, sessionId, user.id)
}

export async function saveMatch(sessionId: string, teamA: string[], teamB: string[], teamAPositions?: Record<string, string>, teamBPositions?: Record<string, string>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  assertAuthenticated(user)

  const { error } = await insertMatch(supabase, {
    session_id: sessionId,
    hoster_id: user.id,
    team_a_players: teamA,
    team_b_players: teamB,
    team_a_score: 0,
    team_b_score: 0,
    team_a_positions: teamAPositions || {},
    team_b_positions: teamBPositions || {},
    is_completed: false,
  })

  if (error) {
    console.error('FAILED TO INSERT MATCH', error)
    throw new ActionError('saveMatchFailed')
  }

  const draft = await computeMatchDraft(supabase, sessionId, user.id)
  await updatePendingDraft(supabase, sessionId, draft ?? null)

  revalidatePath(`/dashboard/live/${sessionId}`)
}

export async function updateScore(matchId: string, sessionId: string, team: 'a' | 'b', increment: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  assertAuthenticated(user)

  const match = await getMatchScores(supabase, matchId)
  if (!match) return

  const newScoreA = team === 'a' ? Math.max(0, match.team_a_score + increment) : match.team_a_score
  const newScoreB = team === 'b' ? Math.max(0, match.team_b_score + increment) : match.team_b_score

  const { error } = await updateMatchScores(supabase, matchId, newScoreA, newScoreB, {
    match_id: matchId,
    event_type: 'score',
    team,
    increment,
    score_a: newScoreA,
    score_b: newScoreB,
  })

  if (error) {
    console.error('FAILED TO INSERT MATCH EVENT:', error)
  }
}

export async function finishMatch(matchId: string, sessionId: string, destination: 'draft' | 'attendance' = 'attendance') {
  const supabase = await createClient()

  const match = await getMatchById(supabase, matchId)
  if (!match) return

  if (match.is_completed) {
    if (destination === 'draft') revalidatePath(`/dashboard/live/${sessionId}`, 'page')
    else { revalidatePath('/dashboard/session', 'page'); redirect('/dashboard/session') }
    return
  }

  const { data: { user } } = await supabase.auth.getUser()
  assertAuthenticated(user)

  await completeMatch(supabase, matchId)

  const draft = await computeMatchDraft(supabase, sessionId, user.id)
  await updatePendingDraft(supabase, sessionId, draft ?? null)

  after(() => {
    processBackgroundMatch(matchId, sessionId, user.id).catch(err => console.error('Background finish-match failed:', err))
  })

  if (destination === 'draft') {
    revalidatePath(`/dashboard/live/${sessionId}`, 'page')
  } else {
    revalidatePath('/dashboard/session', 'page')
    redirect('/dashboard/session')
  }
}

export async function cancelMatch(matchId: string, sessionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  assertAuthenticated(user)

  await deleteMatch(supabase, matchId)
  revalidatePath('/dashboard/session', 'page')
  redirect('/dashboard/session')
}
