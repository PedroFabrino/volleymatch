import type { TypedSupabaseClient } from '@/types/supabase'
import type { Database } from '@/types/database'
import { mapMatchRow } from './mappers'

type MatchInsert = Database['public']['Tables']['matches']['Insert']
type MatchEventInsert = Database['public']['Tables']['match_events']['Insert']

export async function getCompletedMatches(supabase: TypedSupabaseClient, hosterId: string) {
  const { data } = await supabase
    .from('matches')
    .select('*')
    .eq('hoster_id', hosterId)
    .eq('is_completed', true)
    .order('created_at', { ascending: false })
  return (data || []).map(mapMatchRow)
}

export async function getCompletedMatchesWithEvents(supabase: TypedSupabaseClient, hosterId: string) {
  const { data } = await supabase
    .from('matches')
    .select('*, match_events(*)')
    .eq('hoster_id', hosterId)
    .eq('is_completed', true)
    .order('created_at', { ascending: false })
  return data || []
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

export async function insertMatch(
  supabase: TypedSupabaseClient,
  matchData: MatchInsert
) {
  const { error } = await supabase.from('matches').insert(matchData)
  return { error }
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

export async function updateMatchScores(
  supabase: TypedSupabaseClient,
  matchId: string,
  teamAScore: number,
  teamBScore: number,
  event: MatchEventInsert
) {
  const scoreUpdate = supabase
    .from('matches')
    .update({ team_a_score: teamAScore, team_b_score: teamBScore })
    .eq('id', matchId)

  const eventInsert = supabase.from('match_events').insert(event)

  const [, { error }] = await Promise.all([scoreUpdate, eventInsert])
  return { error }
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

export async function completeMatch(
  supabase: TypedSupabaseClient,
  matchId: string
) {
  await supabase
    .from('matches')
    .update({
      is_completed: true,
      completed_at: new Date().toISOString(),
    })
    .eq('id', matchId)
}

export async function deleteMatch(
  supabase: TypedSupabaseClient,
  matchId: string
) {
  await supabase.from('matches').delete().eq('id', matchId)
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

export async function updateMatchTeams(
  supabase: TypedSupabaseClient,
  matchId: string,
  update: {
    team_a_players: string[]
    team_b_players: string[]
    team_a_positions: Record<string, string>
    team_b_positions: Record<string, string>
  }
) {
  await supabase.from('matches').update(update).eq('id', matchId)
}

export async function updateMatchPositions(
  supabase: TypedSupabaseClient,
  matchId: string,
  teamAPositions: Record<string, string>,
  teamBPositions: Record<string, string>
) {
  await supabase
    .from('matches')
    .update({ team_a_positions: teamAPositions, team_b_positions: teamBPositions })
    .eq('id', matchId)
}

export async function swapMatchTeams(
  supabase: TypedSupabaseClient,
  matchId: string,
  match: {
    team_a_players: string[]
    team_b_players: string[]
    team_a_positions: Record<string, string> | null
    team_b_positions: Record<string, string> | null
    team_a_score: number
    team_b_score: number
  }
) {
  await supabase
    .from('matches')
    .update({
      team_a_players: match.team_b_players,
      team_b_players: match.team_a_players,
      team_a_positions: match.team_b_positions,
      team_b_positions: match.team_a_positions,
      team_a_score: match.team_b_score,
      team_b_score: match.team_a_score,
    })
    .eq('id', matchId)
}

export async function insertMatchEvent(
  supabase: TypedSupabaseClient,
  event: MatchEventInsert
) {
  const { error } = await supabase.from('match_events').insert(event)
  return { error }
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

export async function upsertMatchEvents(
  supabase: TypedSupabaseClient,
  events: Database['public']['Tables']['match_events']['Row'][]
) {
  await supabase.from('match_events').upsert(events)
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

export async function insertPointAttribution(
  supabase: TypedSupabaseClient,
  attribution: Database['public']['Tables']['point_attributions']['Insert']
) {
  const { error } = await supabase.from('point_attributions').insert(attribution)
  return { error }
}
