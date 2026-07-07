import { SupabaseClient } from '@supabase/supabase-js'

export async function getCompletedMatches(supabase: SupabaseClient, hosterId: string) {
  const { data } = await supabase
    .from('matches')
    .select('*')
    .eq('hoster_id', hosterId)
    .eq('is_completed', true)
    .order('created_at', { ascending: false })
  return data || []
}
