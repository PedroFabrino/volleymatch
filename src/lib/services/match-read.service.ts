import type { TypedSupabaseClient } from '@/types/supabase'
import type { MatchWithEvents } from '@/types/match'
import { mapMatchRow, mapMatchWithEventsRow } from './mappers'

export async function getCompletedMatches(supabase: TypedSupabaseClient, hosterId: string) {
  const { data } = await supabase
    .from('matches')
    .select('*')
    .eq('hoster_id', hosterId)
    .eq('is_completed', true)
    .order('created_at', { ascending: false })
  return (data || []).map(mapMatchRow)
}

export async function getCompletedMatchesWithEvents(
  supabase: TypedSupabaseClient,
  hosterId: string
): Promise<MatchWithEvents[]> {
  const { data } = await supabase
    .from('matches')
    .select('*, match_events(*)')
    .eq('hoster_id', hosterId)
    .eq('is_completed', true)
    .order('created_at', { ascending: false })
  return (data ?? []).map(mapMatchWithEventsRow)
}

export async function getLastCompletedMatchForSession(
  supabase: TypedSupabaseClient,
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

export async function getLastCompletedMatchWithScores(
  supabase: TypedSupabaseClient,
  sessionId: string
) {
  const { data } = await supabase
    .from('matches')
    .select('team_a_players, team_b_players, team_a_score, team_b_score')
    .eq('session_id', sessionId)
    .eq('is_completed', true)
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}

export async function getMatchScores(
  supabase: TypedSupabaseClient,
  matchId: string
) {
  const { data } = await supabase
    .from('matches')
    .select('team_a_score, team_b_score')
    .eq('id', matchId)
    .single()
  return data
}

export async function getMatchById(
  supabase: TypedSupabaseClient,
  matchId: string
) {
  const { data } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single()
  return data
}

export async function getMatchTeamsAndPositions(
  supabase: TypedSupabaseClient,
  matchId: string
) {
  const { data } = await supabase
    .from('matches')
    .select('team_a_players, team_b_players, team_a_positions, team_b_positions')
    .eq('id', matchId)
    .single()
  return data
}

export async function getMatchForTeamSwap(
  supabase: TypedSupabaseClient,
  matchId: string
) {
  const { data } = await supabase
    .from('matches')
    .select('team_a_players, team_b_players, team_a_positions, team_b_positions, team_a_score, team_b_score')
    .eq('id', matchId)
    .single()
  return data
}

export async function getMatchEvents(
  supabase: TypedSupabaseClient,
  matchId: string
) {
  const { data } = await supabase
    .from('match_events')
    .select('*')
    .eq('match_id', matchId)
  return data || []
}

export async function getMatchForAttribution(
  supabase: TypedSupabaseClient,
  matchId: string
) {
  const { data } = await supabase
    .from('matches')
    .select('is_completed, team_a_players, team_b_players, team_a_score, team_b_score')
    .eq('id', matchId)
    .single()
  return data
}
