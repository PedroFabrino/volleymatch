'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getSessionSummaryData } from '@/lib/stats'

export async function startSession(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const targetScore = parseInt(formData.get('target_score') as string)
  const tieBreaker = formData.get('tie_breaker_rule') as string
  const matchmakingMode = formData.get('matchmaking_mode') as string || 'casual'

  // End any active sessions first
  await supabase
    .from('sessions')
    .update({ is_active: false })
    .eq('hoster_id', user.id)

  // Generate a random 4-digit PIN
  const pin = Math.floor(1000 + Math.random() * 9000).toString()

  // Create new session
  const { data: session, error } = await supabase
    .from('sessions')
    .insert({
      hoster_id: user.id,
      target_score: targetScore,
      tie_breaker_rule: tieBreaker,
      matchmaking_mode: matchmakingMode,
      is_active: true,
      pin: pin
    })
    .select()
    .single()

  if (error || !session) {
    console.error('Error starting session:', error)
    return
  }

  // Initialize session_players for all present players
  const { data: presentPlayers } = await supabase.from('players').select('id, mmr').eq('hoster_id', user.id).eq('is_present_today', true)
  if (presentPlayers && presentPlayers.length > 0) {
    await supabase.from('session_players').insert(
      presentPlayers.map(p => ({ session_id: session.id, player_id: p.id, games_played: 0 }))
    )
    
    // Log the starting MMR snapshot for the history table
    await supabase.from('mmr_history').insert(
      presentPlayers.map(p => ({
        player_id: p.id,
        hoster_id: user.id,
        session_id: session.id,
        old_mmr: p.mmr,
        new_mmr: p.mmr,
        mmr_change: 0,
        reason: 'session_start_snapshot'
      }))
    )
  }

  // Redirect to the active live session page where the matchmaking will happen
  redirect(`/dashboard/live/${session.id}`)
}

export async function endSession(sessionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // 1. Compute and store summary data before marking inactive
  const summaryData = await getSessionSummaryData(supabase, sessionId)

  // 2. Mark session as inactive and store summary
  await supabase
    .from('sessions')
    .update({ 
      is_active: false,
      summary_data: summaryData 
    })
    .eq('id', sessionId)
    .eq('hoster_id', user.id)

  // 3. Reset player daily stats (attendance) and clear temporary session overrides
  await supabase
    .from('players')
    .update({ is_present_today: false, active_positions: null })
    .eq('hoster_id', user.id)

  redirect(`/dashboard/summary/${sessionId}`)
}
