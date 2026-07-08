import { SupabaseClient } from '@supabase/supabase-js'

export async function getPlayers(supabase: SupabaseClient, hosterId: string) {
  const { data } = await supabase
    .from('players')
    .select('id, name, mmr')
    .eq('hoster_id', hosterId)
  return data || []
}

export async function getPlayersByHoster(
  supabase: SupabaseClient,
  hosterId: string
) {
  const { data } = await supabase
    .from('players')
    .select('*')
    .eq('hoster_id', hosterId)
    .order('name', { ascending: true })
  return data ?? []
}

export async function getPlayerByName(
  supabase: SupabaseClient,
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

export async function createPlayer(
  supabase: SupabaseClient,
  playerData: any
) {
  const { data, error } = await supabase
    .from('players')
    .insert(playerData)
    .select()
    .single()
  return { data, error }
}

export async function markPlayerPresent(
  supabase: SupabaseClient,
  playerId: string
) {
  const { error } = await supabase
    .from('players')
    .update({ is_present_today: true })
    .eq('id', playerId)
  return { error }
}

export async function getPlayerCount(
  supabase: SupabaseClient,
  hosterId: string
) {
  const { count } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true })
    .eq('hoster_id', hosterId)
  return count || 0
}

export async function getPresentPlayersByHoster(
  supabase: SupabaseClient,
  hosterId: string
) {
  const { data } = await supabase
    .from('players')
    .select('*')
    .eq('hoster_id', hosterId)
    .eq('is_present_today', true)
  return data || []
}
