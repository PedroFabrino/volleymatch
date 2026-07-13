'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getSessionSummaryData } from '@/lib/stats'
import { assertAuthenticated } from '@/types/action-error'
import { requireHostPermission } from '@/lib/auth/require-host-permission'
import {
  deactivateAllSessions,
  createSession,
  initializeSessionPlayers,
  insertMmrHistorySnapshot,
  endSessionRecord,
  resetPlayerDailyStats,
  getPresentPlayersWithMmr,
  linkGrantToSession,
} from '@/lib/services'

export async function startSession(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  assertAuthenticated(user)

  const ctx = await requireHostPermission(supabase, user.id, 'session_start')

  const targetScore = parseInt(formData.get('target_score') as string)
  const tieBreaker = formData.get('tie_breaker_rule') as string
  const matchmakingMode = formData.get('matchmaking_mode') as string || 'casual'

  await deactivateAllSessions(supabase, ctx.effectiveHosterId)

  const pin = Math.floor(1000 + Math.random() * 9000).toString()

  const { data: session, error } = await createSession(supabase, {
    hoster_id: ctx.effectiveHosterId,
    target_score: targetScore,
    tie_breaker_rule: tieBreaker,
    matchmaking_mode: matchmakingMode,
    is_active: true,
    pin,
  })

  if (error || !session) {
    console.error('Error starting session:', error)
    return
  }

  if (ctx.grantId) {
    await linkGrantToSession(supabase, ctx.grantId, session.id)
  }

  const presentPlayers = await getPresentPlayersWithMmr(supabase, ctx.effectiveHosterId)
  if (presentPlayers.length > 0) {
    await initializeSessionPlayers(supabase, session.id, presentPlayers.map(p => p.id))

    await insertMmrHistorySnapshot(supabase, presentPlayers.map(p => ({
      player_id: p.id,
      hoster_id: ctx.effectiveHosterId,
      session_id: session.id,
      old_mmr: p.mmr,
      new_mmr: p.mmr,
      mmr_change: 0,
      reason: 'session_start_snapshot',
    })))
  }

  redirect(`/dashboard/live/${session.id}`)
}

export async function endSession(sessionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  assertAuthenticated(user)

  const ctx = await requireHostPermission(supabase, user.id, 'session_end', sessionId)

  const summaryData = await getSessionSummaryData(supabase, sessionId)

  await endSessionRecord(supabase, sessionId, ctx.effectiveHosterId, summaryData)
  await resetPlayerDailyStats(supabase, ctx.effectiveHosterId)

  redirect(`/dashboard/summary/${sessionId}`)
}
