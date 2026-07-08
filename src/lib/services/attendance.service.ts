import type { TypedSupabaseClient } from '@/types/supabase'
import type { Database } from '@/types/database'
import type { PlayerPosition } from '@/types/player'

export async function setPlayerAttendance(
  supabase: TypedSupabaseClient,
  playerId: string,
  hosterId: string,
  isPresent: boolean
) {
  await supabase
    .from('players')
    .update({ is_present_today: isPresent })
    .eq('id', playerId)
    .eq('hoster_id', hosterId)
}

export async function batchSetPlayerAttendance(
  supabase: TypedSupabaseClient,
  hosterId: string,
  presentIds: string[],
  absentIds: string[]
) {
  if (presentIds.length > 0) {
    await supabase
      .from('players')
      .update({ is_present_today: true })
      .in('id', presentIds)
      .eq('hoster_id', hosterId)
  }

  if (absentIds.length > 0) {
    await supabase
      .from('players')
      .update({ is_present_today: false })
      .in('id', absentIds)
      .eq('hoster_id', hosterId)
  }
}

export async function setAllPlayerAttendance(
  supabase: TypedSupabaseClient,
  hosterId: string,
  isPresent: boolean
) {
  await supabase
    .from('players')
    .update({ is_present_today: isPresent })
    .eq('hoster_id', hosterId)
}

export async function getPlayerPositionData(
  supabase: TypedSupabaseClient,
  playerId: string
) {
  const { data } = await supabase
    .from('players')
    .select('active_positions, positions')
    .eq('id', playerId)
    .single()
  return data
}

export async function updatePlayerActivePositions(
  supabase: TypedSupabaseClient,
  playerId: string,
  activePositions: PlayerPosition[]
) {
  await supabase
    .from('players')
    .update({
      active_positions: activePositions.filter(p => p !== 'Any') as Database['public']['Enums']['court_position'][],
    })
    .eq('id', playerId)
}

export async function upsertSessionPlayersBatch(
  supabase: TypedSupabaseClient,
  records: { session_id: string; player_id: string; games_played: number }[]
) {
  await supabase.from('session_players').upsert(records, {
    onConflict: 'session_id, player_id',
    ignoreDuplicates: true,
  })
}
