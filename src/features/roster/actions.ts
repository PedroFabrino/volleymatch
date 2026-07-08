'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function addPlayer(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  const name = (formData.get('name') as string).trim()
  
  // Check for duplicate name
  const { data: existingPlayer } = await supabase
    .from('players')
    .select('id')
    .eq('hoster_id', user.id)
    .ilike('name', name)
    .maybeSingle()
    
  if (existingPlayer) {
    redirect('/dashboard/roster?error=Duplicate+player+name')
  }

  const initial_tier = formData.get('initial_tier') as string
  const mmr = initial_tier === 'Beginner' ? 800 : initial_tier === 'Intermediate' ? 1000 : 1200
  
  const positions = formData.getAll('positions') as string[]

  const { error } = await supabase.from('players').insert({
    hoster_id: user.id,
    name,
    mmr,
    initial_tier,
    positions
  })

  if (error) {
    console.error('Error adding player:', error)
  }

  revalidatePath('/dashboard/roster')
  redirect('/dashboard/roster')
}

export async function updatePlayer(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const id = formData.get('id') as string
  const name = (formData.get('name') as string).trim()
  const positions = formData.getAll('positions') as string[]
  const initial_tier = formData.get('initial_tier') as string

  // Check for duplicate name
  const { data: existingPlayer } = await supabase
    .from('players')
    .select('id')
    .eq('hoster_id', user.id)
    .ilike('name', name)
    .neq('id', id)
    .maybeSingle()
    
  if (existingPlayer) {
    redirect(`/dashboard/roster?edit=${id}&error=Duplicate+player+name`)
  }

  const { error } = await supabase.from('players').update({
    name,
    positions,
    initial_tier
  }).eq('id', id).eq('hoster_id', user.id)

  if (error) {
    console.error('Error updating player:', error)
  }

  revalidatePath('/dashboard/roster')
  redirect('/dashboard/roster')
}

export async function deletePlayer(playerId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  await supabase.from('players').delete().eq('id', playerId).eq('hoster_id', user.id)
  revalidatePath('/dashboard/roster')
}

export async function toggleAttendance(playerId: string, isPresent: boolean, activeSessionId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  await supabase
    .from('players')
    .update({ is_present_today: isPresent })
    .eq('id', playerId)
    .eq('hoster_id', user.id)

  if (activeSessionId && isPresent) {
    // Get max games_played for this session to place at the bottom of the queue
    const { data: sessionPlayers } = await supabase
      .from('session_players')
      .select('games_played')
      .eq('session_id', activeSessionId)

    let maxGamesPlayed = 0
    if (sessionPlayers && sessionPlayers.length > 0) {
      maxGamesPlayed = Math.max(...sessionPlayers.map(sp => sp.games_played || 0))
    }

    // Upsert to ensure they have a record but don't overwrite if they already do
    await supabase.from('session_players').upsert(
      { session_id: activeSessionId, player_id: playerId, games_played: maxGamesPlayed },
      { onConflict: 'session_id, player_id', ignoreDuplicates: true }
    )
  }

  // Attendance changed -> invalidate pre-calculated draft
  await supabase
    .from('sessions')
    .update({ pending_draft: null })
    .eq('hoster_id', user.id)
    .eq('is_active', true)

  revalidatePath('/dashboard/session')
}

export async function batchToggleAttendance(updates: { playerId: string, isPresent: boolean, activeSessionId?: string }[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  if (updates.length === 0) return;

  const presentIds = updates.filter(u => u.isPresent).map(u => u.playerId)
  const absentIds = updates.filter(u => !u.isPresent).map(u => u.playerId)

  if (presentIds.length > 0) {
    await supabase.from('players').update({ is_present_today: true }).in('id', presentIds).eq('hoster_id', user.id)
  }
  
  if (absentIds.length > 0) {
    await supabase.from('players').update({ is_present_today: false }).in('id', absentIds).eq('hoster_id', user.id)
  }

  const activeSessionId = updates[0]?.activeSessionId
  if (activeSessionId && presentIds.length > 0) {
    // Get max games_played for this session to place at the bottom of the queue
    const { data: sessionPlayersData } = await supabase
      .from('session_players')
      .select('games_played')
      .eq('session_id', activeSessionId)

    let maxGamesPlayed = 0
    if (sessionPlayersData && sessionPlayersData.length > 0) {
      maxGamesPlayed = Math.max(...sessionPlayersData.map(sp => sp.games_played || 0))
    }

    const sessionPlayers = presentIds.map(id => ({
      session_id: activeSessionId,
      player_id: id,
      games_played: maxGamesPlayed
    }))
    
    await supabase.from('session_players').upsert(
      sessionPlayers,
      { onConflict: 'session_id, player_id', ignoreDuplicates: true }
    )
  }

  // Attendance changed -> invalidate pre-calculated draft
  await supabase
    .from('sessions')
    .update({ pending_draft: null })
    .eq('hoster_id', user.id)
    .eq('is_active', true)

  revalidatePath('/dashboard/session')
}

export async function toggleActivePosition(playerId: string, pos: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: player } = await supabase.from('players').select('active_positions, positions').eq('id', playerId).single()
  if (!player) return

  let currentPositions = player.active_positions !== null
    ? player.active_positions 
    : player.positions;
    
  if (currentPositions.includes(pos)) {
    currentPositions = currentPositions.filter((p: string) => p !== pos)
  } else {
    currentPositions = [...currentPositions, pos]
  }

  await supabase.from('players').update({ active_positions: currentPositions }).eq('id', playerId)

  // Position override changed -> invalidate pre-calculated draft
  await supabase
    .from('sessions')
    .update({ pending_draft: null })
    .eq('hoster_id', user.id)
    .eq('is_active', true)

  revalidatePath('/dashboard/session')
}

export async function setAllAttendance(isPresent: boolean, activeSessionId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  await supabase
    .from('players')
    .update({ is_present_today: isPresent })
    .eq('hoster_id', user.id)

  if (activeSessionId && isPresent) {
    const { data: players } = await supabase.from('players').select('id').eq('hoster_id', user.id)
    
    if (players && players.length > 0) {
      const { data: sessionPlayersData } = await supabase
        .from('session_players')
        .select('games_played')
        .eq('session_id', activeSessionId)

      let maxGamesPlayed = 0
      if (sessionPlayersData && sessionPlayersData.length > 0) {
        maxGamesPlayed = Math.max(...sessionPlayersData.map(sp => sp.games_played || 0))
      }

      const sessionPlayers = players.map(p => ({
        session_id: activeSessionId,
        player_id: p.id,
        games_played: maxGamesPlayed
      }))
      
      await supabase.from('session_players').upsert(
        sessionPlayers,
        { onConflict: 'session_id, player_id', ignoreDuplicates: true }
      )
    }
  }

  // Attendance changed -> invalidate pre-calculated draft
  await supabase
    .from('sessions')
    .update({ pending_draft: null })
    .eq('hoster_id', user.id)
    .eq('is_active', true)

  revalidatePath('/dashboard/session')
}
