'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { parsePlayerPosition, parsePlayerPositions } from '@/types/player'
import { assertAuthenticated } from '@/types/action-error'
import { requireHostPermission } from '@/lib/auth/require-host-permission'
import {
  setPlayerAttendance,
  batchSetPlayerAttendance,
  setAllPlayerAttendance,
  getPlayerPositionData,
  updatePlayerActivePositions,
  upsertSessionPlayersBatch,
  clearPendingDraftForActiveSession,
  getMaxGamesPlayed,
  getPresentPlayerIds,
} from '@/lib/services'

export async function toggleAttendance(playerId: string, isPresent: boolean, activeSessionId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  assertAuthenticated(user)

  const ctx = await requireHostPermission(
    supabase,
    user.id,
    'attendance',
    activeSessionId
  )

  await setPlayerAttendance(supabase, playerId, ctx.effectiveHosterId, isPresent)

  if (activeSessionId && isPresent) {
    const maxGamesPlayed = await getMaxGamesPlayed(supabase, activeSessionId)

    await upsertSessionPlayersBatch(supabase, [{
      session_id: activeSessionId,
      player_id: playerId,
      games_played: maxGamesPlayed,
    }])
  }

  await clearPendingDraftForActiveSession(supabase, ctx.effectiveHosterId)

  revalidatePath('/dashboard/session')
}

export async function batchToggleAttendance(updates: { playerId: string, isPresent: boolean, activeSessionId?: string }[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  assertAuthenticated(user)

  const sessionId = updates[0]?.activeSessionId
  const ctx = await requireHostPermission(supabase, user.id, 'attendance', sessionId)

  if (updates.length === 0) return

  const presentIds = updates.filter(u => u.isPresent).map(u => u.playerId)
  const absentIds = updates.filter(u => !u.isPresent).map(u => u.playerId)

  await batchSetPlayerAttendance(supabase, ctx.effectiveHosterId, presentIds, absentIds)

  const activeSessionId = updates[0]?.activeSessionId
  if (activeSessionId && presentIds.length > 0) {
    const maxGamesPlayed = await getMaxGamesPlayed(supabase, activeSessionId)

    const sessionPlayers = presentIds.map(id => ({
      session_id: activeSessionId,
      player_id: id,
      games_played: maxGamesPlayed,
    }))

    await upsertSessionPlayersBatch(supabase, sessionPlayers)
  }

  await clearPendingDraftForActiveSession(supabase, ctx.effectiveHosterId)

  revalidatePath('/dashboard/session')
}

export async function toggleActivePosition(playerId: string, pos: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  assertAuthenticated(user)

  const ctx = await requireHostPermission(supabase, user.id, 'attendance')

  const parsedPos = parsePlayerPosition(pos)
  if (!parsedPos || parsedPos === 'Any') return

  const player = await getPlayerPositionData(supabase, playerId)
  if (!player) return

  const defaultPositions = parsePlayerPositions(player.positions)
  let currentPositions = player.active_positions !== null
    ? parsePlayerPositions(player.active_positions)
    : defaultPositions

  if (currentPositions.includes(parsedPos)) {
    currentPositions = currentPositions.filter(p => p !== parsedPos)
  } else {
    currentPositions = [...currentPositions, parsedPos]
  }

  await updatePlayerActivePositions(supabase, playerId, currentPositions)

  await clearPendingDraftForActiveSession(supabase, ctx.effectiveHosterId)

  revalidatePath('/dashboard/session')
}

export async function setAllAttendance(isPresent: boolean, activeSessionId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  assertAuthenticated(user)

  const ctx = await requireHostPermission(supabase, user.id, 'attendance', activeSessionId)

  await setAllPlayerAttendance(supabase, ctx.effectiveHosterId, isPresent)

  if (activeSessionId && isPresent) {
    const players = await getPresentPlayerIds(supabase, ctx.effectiveHosterId)

    if (players.length > 0) {
      const maxGamesPlayed = await getMaxGamesPlayed(supabase, activeSessionId)

      const sessionPlayers = players.map(p => ({
        session_id: activeSessionId,
        player_id: p.id,
        games_played: maxGamesPlayed,
      }))

      await upsertSessionPlayersBatch(supabase, sessionPlayers)
    }
  }

  await clearPendingDraftForActiveSession(supabase, ctx.effectiveHosterId)

  revalidatePath('/dashboard/session')
}
