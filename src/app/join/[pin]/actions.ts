'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function joinSessionAction(formData: FormData) {
  const supabase = await createClient()

  const sessionId = formData.get('sessionId') as string
  const pin = formData.get('pin') as string
  const name = formData.get('name') as string
  const playerId = formData.get('playerId') as string
  
  // For new players
  const initialTier = formData.get('initial_tier') as string
  const positions = formData.getAll('positions') as string[]

  // Validate session exists and is active
  const { data: session } = await supabase
    .from('sessions')
    .select('id, hoster_id')
    .eq('id', sessionId)
    .single()

  if (!session) {
    throw new Error('Invalid session.')
  }

  let finalPlayerId = playerId

  if (playerId) {
    // Returning player
    await supabase
      .from('players')
      .update({ is_present_today: true })
      .eq('id', playerId)

  } else {
    // New player
    const mmr = initialTier === 'Beginner' ? 800 : initialTier === 'Intermediate' ? 1000 : 1200
    
    // Safety check for duplicate name
    const { data: existingPlayer } = await supabase
      .from('players')
      .select('id')
      .eq('hoster_id', session.hoster_id)
      .ilike('name', name.trim())
      .maybeSingle()

    if (existingPlayer) {
      throw new Error('A player with this name already exists. Please choose a different name or select your profile.')
    }

    const { data: newPlayer, error: createError } = await supabase
      .from('players')
      .insert({
        hoster_id: session.hoster_id,
        name: name.trim(),
        mmr,
        initial_tier: initialTier,
        positions,
        is_present_today: true
      })
      .select()
      .single()

    if (createError || !newPlayer) {
      throw new Error('Failed to create your profile.')
    }

    finalPlayerId = newPlayer.id
  }

  // Ensure they are in the session_players table
  await supabase.from('session_players').upsert(
    { session_id: sessionId, player_id: finalPlayerId, games_played: 0 },
    { onConflict: 'session_id, player_id', ignoreDuplicates: true }
  )

  return { success: true }
}
