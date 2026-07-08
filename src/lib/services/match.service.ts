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

export async function getCompletedMatchesWithEvents(supabase: SupabaseClient, hosterId: string) {
  const { data } = await supabase
    .from('matches')
    .select('*, match_events(*)')
    .eq('hoster_id', hosterId)
    .eq('is_completed', true)
    .order('created_at', { ascending: false })
  return data || []
}

export async function getLastCompletedMatchForSession(
  supabase: SupabaseClient,
  sessionId: string
) {
  const { data } = await supabase
    .from('matches')
    .select('team_a_players, team_b_players')
    .eq('session_id', sessionId)
    .eq('is_completed', true)
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}
