import type { TypedSupabaseClient } from '@/types/supabase'
import { mapSessionRow, mapSessionWithPinRow, mapMatchRow } from './mappers'

export async function getActiveSession(supabase: TypedSupabaseClient, userId: string) {
  const { data } = await supabase
    .from('sessions')
    .select('id')
    .eq('hoster_id', userId)
    .eq('is_active', true)
    .single()
  return data
}

export async function getSessionById(
  supabase: TypedSupabaseClient,
  sessionId: string,
  hosterId: string
) {
  const { data } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('hoster_id', hosterId)
    .single()
  return data ? { ...mapSessionRow(data), summary_data: data.summary_data } : null
}

export async function getSessionByIdAdmin(supabase: TypedSupabaseClient, sessionId: string) {
  const { data, error } = await supabase
    .from('sessions')
    .select('id, hoster_id, created_at')
    .eq('id', sessionId)
    .single()
  return { data, error }
}

export async function getSessionByPin(supabase: TypedSupabaseClient, pin: string) {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('pin', pin)
    .eq('is_active', true)
    .single()
  return { data: data ? mapSessionWithPinRow(data) : null, error }
}

export async function getPastSessions(
  supabase: TypedSupabaseClient,
  userId: string,
  limit = 5
) {
  const { data } = await supabase
    .from('sessions')
    .select('id, created_at, is_active')
    .eq('hoster_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return data || []
}

export async function getActiveMatchForSession(
  supabase: TypedSupabaseClient,
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
  return data ? mapMatchRow(data) : null
}

export async function getSessionPlayersMap(
  supabase: TypedSupabaseClient,
  sessionId: string
): Promise<Map<string, number>> {
  const { data } = await supabase
    .from('session_players')
    .select('player_id, games_played')
    .eq('session_id', sessionId)
  return new Map((data ?? []).map(sp => [sp.player_id, sp.games_played]))
}

export async function getSessionPlayersList(
  supabase: TypedSupabaseClient,
  sessionId: string
) {
  const { data } = await supabase
    .from('session_players')
    .select('player_id, games_played')
    .eq('session_id', sessionId)
  return data || []
}

export async function getMaxGamesPlayed(
  supabase: TypedSupabaseClient,
  sessionId: string
) {
  const { data } = await supabase
    .from('session_players')
    .select('games_played')
    .eq('session_id', sessionId)

  if (!data || data.length === 0) return 0
  return Math.max(...data.map(sp => sp.games_played || 0))
}

export async function getLiveSessionData(
  supabase: TypedSupabaseClient,
  sessionId: string,
  userId: string
) {
  const [
    { data: session },
    { data: activeMatch },
    { data: players },
    { data: sessionPlayersData },
    { count: completedMatchesCount },
  ] = await Promise.all([
    supabase.from('sessions').select('*').eq('id', sessionId).single(),
    supabase
      .from('matches')
      .select('*')
      .eq('session_id', sessionId)
      .eq('is_completed', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('players').select('*').eq('hoster_id', userId),
    supabase
      .from('session_players')
      .select('player_id, games_played')
      .eq('session_id', sessionId),
    supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .eq('is_completed', true),
  ])

  return {
    session: session ? { ...mapSessionRow(session), pin: session.pin ?? undefined } : null,
    activeMatch: activeMatch ? mapMatchRow(activeMatch) : null,
    players,
    sessionPlayersData,
    completedMatchesCount,
  }
}
