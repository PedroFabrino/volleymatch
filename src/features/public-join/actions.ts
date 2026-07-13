'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { tierToMmr } from '@/types/player'
import {
  getSessionByIdAdmin,
  getMaxGamesPlayed,
  addPlayerToSession,
  getPlayerByName,
  createPlayer,
  markPlayerPresent,
} from '@/lib/services'

export type JoinSessionError = 'invalidSession' | 'duplicateName' | 'createFailed'

export type JoinSessionResult =
  | { success: true }
  | { error: JoinSessionError }

export async function joinSessionAction(formData: FormData): Promise<JoinSessionResult> {
  const supabase = createAdminClient()

  const sessionId = formData.get('sessionId') as string
  const name = formData.get('name') as string
  const playerId = formData.get('playerId') as string

  const initialTier = formData.get('initial_tier') as string
  const positions = formData.getAll('positions') as string[]

  const { data: session, error: sessionError } = await getSessionByIdAdmin(supabase, sessionId)

  if (sessionError || !session) {
    console.error('Session lookup error:', sessionError)
    return { error: 'invalidSession' }
  }

  let finalPlayerId = playerId

  if (playerId) {
    await markPlayerPresent(supabase, playerId)
  } else {
    const mmr = tierToMmr(initialTier)

    const existingPlayer = await getPlayerByName(supabase, session.hoster_id, name.trim())

    if (existingPlayer) {
      return { error: 'duplicateName' }
    }

    const { data: newPlayer, error: createError } = await createPlayer(supabase, {
      hoster_id: session.hoster_id,
      name: name.trim(),
      mmr,
      initial_tier: initialTier,
      positions: positions as string[],
      is_present_today: true,
      is_temporary: false,
    })

    if (createError || !newPlayer) {
      return { error: 'createFailed' }
    }

    finalPlayerId = newPlayer.id
  }

  const maxGamesPlayed = await getMaxGamesPlayed(supabase, sessionId)
  await addPlayerToSession(supabase, sessionId, finalPlayerId, maxGamesPlayed)

  return { success: true }
}
