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
