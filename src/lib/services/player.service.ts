import type { TypedSupabaseClient } from '@/types/supabase'
import type { CreatePlayerInput } from '@/types/player'
import { parsePlayerPositions } from '@/types/player'
import type { Database } from '@/types/database'

type PlayerRow = Database['public']['Tables']['players']['Row']
type PlayerInsert = Database['public']['Tables']['players']['Insert']
type PlayerUpdate = Database['public']['Tables']['players']['Update']

function mapPlayerRow(row: PlayerRow) {
  return {
    ...row,
    positions: parsePlayerPositions(row.positions),
    active_positions: row.active_positions
      ? parsePlayerPositions(row.active_positions)
      : null,
  }
}

export async function getPlayers(supabase: TypedSupabaseClient, hosterId: string) {
  const { data } = await supabase
    .from('players')
    .select('id, name, mmr')
    .eq('hoster_id', hosterId)
  return data || []
}

export async function getPlayersByHoster(
  supabase: TypedSupabaseClient,
  hosterId: string
) {
  const { data } = await supabase
    .from('players')
    .select('*')
    .eq('hoster_id', hosterId)
    .order('name', { ascending: true })
  return (data ?? []).map(mapPlayerRow)
}

export async function getPlayerByName(
  supabase: TypedSupabaseClient,
  hosterId: string,
  name: string
) {
  const { data } = await supabase
    .from('players')
    .select('id')
    .eq('hoster_id', hosterId)
    .ilike('name', name)
    .maybeSingle()
  return data
}

export async function findDuplicatePlayerName(
  supabase: TypedSupabaseClient,
  hosterId: string,
  name: string,
  excludeId?: string
) {
  let query = supabase
    .from('players')
    .select('id')
    .eq('hoster_id', hosterId)
    .ilike('name', name)

  if (excludeId) {
    query = query.neq('id', excludeId)
  }

  const { data } = await query.maybeSingle()
  return data
}

export async function createPlayer(
  supabase: TypedSupabaseClient,
  playerData: CreatePlayerInput
) {
  const insertData: PlayerInsert = {
    hoster_id: playerData.hoster_id,
    name: playerData.name,
    mmr: playerData.mmr,
    initial_tier: playerData.initial_tier as PlayerInsert['initial_tier'],
    positions: playerData.positions as PlayerInsert['positions'],
    is_present_today: playerData.is_present_today ?? false,
  }

  const { data, error } = await supabase
    .from('players')
    .insert(insertData)
    .select()
    .single()
  return { data: data ? mapPlayerRow(data) : null, error }
}

export async function insertPlayer(
  supabase: TypedSupabaseClient,
  playerData: PlayerInsert
) {
  const { error } = await supabase.from('players').insert(playerData)
  return { error }
}

export async function updatePlayerRecord(
  supabase: TypedSupabaseClient,
  playerId: string,
  hosterId: string,
  update: PlayerUpdate
) {
  const { error } = await supabase
    .from('players')
    .update(update)
    .eq('id', playerId)
    .eq('hoster_id', hosterId)
  return { error }
}

export async function deletePlayerRecord(
  supabase: TypedSupabaseClient,
  playerId: string,
  hosterId: string
) {
  await supabase.from('players').delete().eq('id', playerId).eq('hoster_id', hosterId)
}

export async function markPlayerPresent(
  supabase: TypedSupabaseClient,
  playerId: string
) {
  const { error } = await supabase
    .from('players')
    .update({ is_present_today: true })
    .eq('id', playerId)
  return { error }
}

export async function getPlayerCount(
  supabase: TypedSupabaseClient,
  hosterId: string
) {
  const { count } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true })
    .eq('hoster_id', hosterId)
  return count || 0
}

export async function getPresentPlayersByHoster(
  supabase: TypedSupabaseClient,
  hosterId: string
) {
  const { data } = await supabase
    .from('players')
    .select('*')
    .eq('hoster_id', hosterId)
    .eq('is_present_today', true)
  return (data || []).map(mapPlayerRow)
}

export async function getPresentPlayerIds(
  supabase: TypedSupabaseClient,
  hosterId: string
) {
  const { data } = await supabase
    .from('players')
    .select('id')
    .eq('hoster_id', hosterId)
  return data || []
}

export async function getPresentPlayersWithMmr(
  supabase: TypedSupabaseClient,
  hosterId: string
) {
  const { data } = await supabase
    .from('players')
    .select('id, mmr')
    .eq('hoster_id', hosterId)
    .eq('is_present_today', true)
  return data || []
}

export async function resetPlayerDailyStats(
  supabase: TypedSupabaseClient,
  hosterId: string
) {
  await supabase
    .from('players')
    .update({ is_present_today: false, active_positions: null })
    .eq('hoster_id', hosterId)
}
