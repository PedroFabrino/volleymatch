'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import {
  getSessionByIdAdmin,
  getMaxGamesPlayed,
  addPlayerToSession,
  getPlayerByName,
  createPlayer,
  markPlayerPresent,
} from '@/lib/services'

export async function joinSessionAction(formData: FormData) {
  const supabase = createAdminClient()

  const sessionId = formData.get('sessionId') as string
  const name = formData.get('name') as string
  const playerId = formData.get('playerId') as string

  const initialTier = formData.get('initial_tier') as string
  const positions = formData.getAll('positions') as string[]

  const { data: session, error: sessionError } = await getSessionByIdAdmin(supabase, sessionId)

  if (sessionError || !session) {
    console.error('Session lookup error:', sessionError)
    throw new Error('Invalid session.')
  }

  let finalPlayerId = playerId

  if (playerId) {
    await markPlayerPresent(supabase, playerId)
  } else {
    const mmr = initialTier === 'Beginner' ? 800 : initialTier === 'Intermediate' ? 1000 : 1200

    const existingPlayer = await getPlayerByName(supabase, session.hoster_id, name.trim())

    if (existingPlayer) {
      throw new Error('A player with this name already exists. Please choose a different name or select your profile.')
    }

    const { data: newPlayer, error: createError } = await createPlayer(supabase, {
      hoster_id: session.hoster_id,
      name: name.trim(),
      mmr,
      initial_tier: initialTier,
      positions,
      is_present_today: true,
    })

    if (createError || !newPlayer) {
      throw new Error('Failed to create your profile.')
    }

    finalPlayerId = newPlayer.id
  }

  const maxGamesPlayed = await getMaxGamesPlayed(supabase, sessionId)
  await addPlayerToSession(supabase, sessionId, finalPlayerId, maxGamesPlayed)

  return { success: true }
}
