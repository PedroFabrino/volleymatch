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

export async function getSessionById(supabase: SupabaseClient, sessionId: string, hosterId: string) {
  const { data } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('hoster_id', hosterId)
    .single()
  return data
}

export async function getSessionByIdAdmin(supabase: SupabaseClient, sessionId: string) {
  const { data, error } = await supabase
    .from('sessions')
    .select('id, hoster_id, created_at')
    .eq('id', sessionId)
    .single()
  return { data, error }
}

export async function getSessionByPin(supabase: SupabaseClient, pin: string) {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('pin', pin)
    .eq('is_active', true)
    .single()
  return { data, error }
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
    .select('*')
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

export async function getSessionPlayersList(
  supabase: SupabaseClient,
  sessionId: string
) {
  const { data } = await supabase
    .from('session_players')
    .select('player_id, games_played')
    .eq('session_id', sessionId)
  return data || []
}

export async function getMaxGamesPlayed(
  supabase: SupabaseClient,
  sessionId: string
) {
  const { data } = await supabase
    .from('session_players')
    .select('games_played')
    .eq('session_id', sessionId)
  
  if (!data || data.length === 0) return 0
  return Math.max(...data.map(sp => sp.games_played || 0))
}

export async function addPlayerToSession(
  supabase: SupabaseClient,
  sessionId: string,
  playerId: string,
  gamesPlayed: number
) {
  const { error } = await supabase.from('session_players').upsert(
    { session_id: sessionId, player_id: playerId, games_played: gamesPlayed },
    { onConflict: 'session_id, player_id', ignoreDuplicates: true }
  )
  return { error }
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

