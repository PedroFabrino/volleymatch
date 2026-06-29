'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function toggleAttendance(playerId: string, isPresent: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  await supabase
    .from('players')
    .update({ is_present_today: isPresent, games_played_today: 0 })
    .eq('id', playerId)
    .eq('hoster_id', user.id)

  revalidatePath('/dashboard/session')
}

export async function toggleActivePosition(playerId: string, pos: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: player } = await supabase.from('players').select('active_positions, positions').eq('id', playerId).single()
  if (!player) return

  let currentPositions = player.active_positions && player.active_positions.length > 0 
    ? player.active_positions 
    : player.positions;
    
  if (currentPositions.includes(pos)) {
    currentPositions = currentPositions.filter((p: string) => p !== pos)
  } else {
    currentPositions = [...currentPositions, pos]
  }

  await supabase.from('players').update({ active_positions: currentPositions }).eq('id', playerId)
}

export async function startSession(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const targetScore = parseInt(formData.get('target_score') as string)
  const tieBreaker = formData.get('tie_breaker_rule') as string

  // End any active sessions first
  await supabase
    .from('sessions')
    .update({ is_active: false })
    .eq('hoster_id', user.id)

  // Create new session
  const { data: session, error } = await supabase
    .from('sessions')
    .insert({
      hoster_id: user.id,
      target_score: targetScore,
      tie_breaker_rule: tieBreaker,
      is_active: true
    })
    .select()
    .single()

  if (error || !session) {
    console.error('Error starting session:', error)
    return
  }

  // Redirect to the active live session page where the matchmaking will happen
  redirect(`/dashboard/live/${session.id}`)
}
