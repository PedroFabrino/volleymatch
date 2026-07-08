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

export async function storeSummaryData(
  supabase: SupabaseClient,
  sessionId: string,
  summaryData: unknown
): Promise<void> {
  await supabase
    .from('sessions')
    .update({ summary_data: summaryData })
    .eq('id', sessionId)
}

export async function getActiveMatchForSession(
  supabase: SupabaseClient,
  sessionId: string
) {
  const { data } = await supabase
    .from('matches')
    .select('team_a_players, team_b_players')
    .eq('session_id', sessionId)
    .eq('is_completed', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}

export async function getSessionPlayersMap(
  supabase: SupabaseClient,
  sessionId: string
): Promise<Map<string, number>> {
  const { data } = await supabase
    .from('session_players')
    .select('player_id, games_played')
    .eq('session_id', sessionId)
  return new Map((data ?? []).map(sp => [sp.player_id, sp.games_played]))
}

export async function getLiveSessionData(supabase: SupabaseClient, sessionId: string, userId: string) {
  const [
    { data: session },
    { data: activeMatch },
    { data: players },
    { data: sessionPlayersData },
    { count: completedMatchesCount }
  ] = await Promise.all([
    supabase.from('sessions').select('*').eq('id', sessionId).single(),
    supabase.from('matches').select('*').eq('session_id', sessionId).eq('is_completed', false).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('players').select('*').eq('hoster_id', userId),
    supabase.from('session_players').select('player_id, games_played').eq('session_id', sessionId),
    supabase.from('matches').select('*', { count: 'exact', head: true }).eq('session_id', sessionId).eq('is_completed', true)
  ])

  return {
    session,
    activeMatch,
    players,
    sessionPlayersData,
    completedMatchesCount
  }
}

