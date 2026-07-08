'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { getSessionByIdAdmin, getMaxGamesPlayed, addPlayerToSession } from '@/lib/services'
import { getPlayerByName, createPlayer, markPlayerPresent } from '@/lib/services'

export async function joinSessionAction(formData: FormData) {
  // Use admin client to bypass RLS since the QR scanner is an unauthenticated guest
  const supabase = createAdminClient()

  const sessionId = formData.get('sessionId') as string
  const pin = formData.get('pin') as string
  const name = formData.get('name') as string
  const playerId = formData.get('playerId') as string
  
  // For new players
  const initialTier = formData.get('initial_tier') as string
  const positions = formData.getAll('positions') as string[]

  // Validate session exists and is active
  const { data: session, error: sessionError } = await getSessionByIdAdmin(supabase, sessionId)

  if (sessionError || !session) {
    console.error("Session lookup error:", sessionError)
    throw new Error('Invalid session.')
  }

  let finalPlayerId = playerId

  if (playerId) {
    // Returning player
    await markPlayerPresent(supabase, playerId)

  } else {
    // New player
    const mmr = initialTier === 'Beginner' ? 800 : initialTier === 'Intermediate' ? 1000 : 1200
    
    // Safety check for duplicate name
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
      is_present_today: true
    })

    if (createError || !newPlayer) {
      throw new Error('Failed to create your profile.')
    }

    finalPlayerId = newPlayer.id
  }

  // Get the current max games_played for this session to place the user at the bottom of the queue
  const maxGamesPlayed = await getMaxGamesPlayed(supabase, sessionId)

  // Ensure they are in the session_players table
  await addPlayerToSession(supabase, sessionId, finalPlayerId, maxGamesPlayed)

  return { success: true }
}
