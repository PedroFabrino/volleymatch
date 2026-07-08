import type { TypedSupabaseClient } from '@/types/supabase'
import type { Database } from '@/types/database'

type MatchInsert = Database['public']['Tables']['matches']['Insert']
type MatchEventInsert = Database['public']['Tables']['match_events']['Insert']

export async function insertMatch(
  supabase: TypedSupabaseClient,
  matchData: MatchInsert
) {
  const { error } = await supabase.from('matches').insert(matchData)
  return { error }
}

export async function applyMatchScoreDelta(
  supabase: TypedSupabaseClient,
  matchId: string,
  team: 'a' | 'b',
  delta: number,
  expectedA: number,
  expectedB: number
) {
  const { data, error } = await supabase.rpc('apply_match_score_delta', {
    p_match_id: matchId,
    p_team: team,
    p_delta: delta,
    p_expected_a: expectedA,
    p_expected_b: expectedB,
  })

  const row = data?.[0]
  return {
    applied: row?.applied ?? false,
    teamAScore: row?.team_a_score ?? expectedA,
    teamBScore: row?.team_b_score ?? expectedB,
    error,
  }
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

export async function upsertMatchEvents(
  supabase: TypedSupabaseClient,
  events: Database['public']['Tables']['match_events']['Row'][]
) {
  await supabase.from('match_events').upsert(events)
}

export async function insertPointAttribution(
  supabase: TypedSupabaseClient,
  attribution: Database['public']['Tables']['point_attributions']['Insert']
) {
  const { error } = await supabase.from('point_attributions').insert(attribution)
  return { error }
}
