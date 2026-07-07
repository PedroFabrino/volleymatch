import { SupabaseClient } from '@supabase/supabase-js'

export async function getActiveSession(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from('sessions')
    .select('id')
    .eq('hoster_id', userId)
    .eq('is_active', true)
    .single()
  return data
}

export async function getPastSessions(supabase: SupabaseClient, userId: string, limit = 5) {
  const { data } = await supabase
    .from('sessions')
    .select('id, created_at, is_active')
    .eq('hoster_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return data || []
}
