'use server'

import { createClient } from '@/lib/supabase/server'
import { after } from 'next/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { ActionError, assertAuthenticated } from '@/types/action-error'
import { requireHostPermission } from '@/lib/auth/require-host-permission'
import {
  insertMatch,
  getMatchById,
  completeMatch,
  deleteMatch,
  updatePendingDraft,
  applyMatchScoreDelta,
  getActiveMatchForSession,
} from '@/lib/services'
import { computeMatchDraft, processBackgroundMatch } from './_draft'

export async function generateMatch(sessionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  assertAuthenticated(user)

  const ctx = await requireHostPermission(supabase, user.id, 'session_live', sessionId)
  return await computeMatchDraft(supabase, sessionId, ctx.effectiveHosterId)
}

export async function saveMatch(sessionId: string, teamA: string[], teamB: string[], teamAPositions?: Record<string, string>, teamBPositions?: Record<string, string>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  assertAuthenticated(user)

  const ctx = await requireHostPermission(supabase, user.id, 'session_live', sessionId)

  const existing = await getActiveMatchForSession(supabase, sessionId)
  if (existing) {
    throw new ActionError('conflict')
  }

  const { error } = await insertMatch(supabase, {
    session_id: sessionId,
    hoster_id: ctx.effectiveHosterId,
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

  const draft = await computeMatchDraft(supabase, sessionId, ctx.effectiveHosterId)
  await updatePendingDraft(supabase, sessionId, draft ?? null)

  revalidatePath(`/dashboard/live/${sessionId}`)
}

export async function updateScore(
  matchId: string,
  sessionId: string,
  team: 'a' | 'b',
  increment: number,
  expectedA: number,
  expectedB: number
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  assertAuthenticated(user)

  await requireHostPermission(supabase, user.id, 'session_live', sessionId)

  const result = await applyMatchScoreDelta(
    supabase,
    matchId,
    team,
    increment,
    expectedA,
    expectedB
  )

  if (result.error) {
    console.error('FAILED TO APPLY SCORE DELTA:', result.error)
  }

  return {
    applied: result.applied,
    teamAScore: result.teamAScore,
    teamBScore: result.teamBScore,
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

  const ctx = await requireHostPermission(supabase, user.id, 'session_live', sessionId)

  await completeMatch(supabase, matchId)

  const draft = await computeMatchDraft(supabase, sessionId, ctx.effectiveHosterId)
  await updatePendingDraft(supabase, sessionId, draft ?? null)

  after(() => {
    processBackgroundMatch(matchId, sessionId, ctx.effectiveHosterId).catch(err => console.error('Background finish-match failed:', err))
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

  await requireHostPermission(supabase, user.id, 'session_live', sessionId)

  await deleteMatch(supabase, matchId)
  revalidatePath('/dashboard/session', 'page')
  redirect('/dashboard/session')
}
