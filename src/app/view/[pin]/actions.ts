'use server'

import { createClient } from '@/lib/supabase/server'

export async function submitPointAttribution(
  matchId: string,
  sessionId: string,
  playerId: string,
  team: 'a' | 'b',
  scoreA: number,
  scoreB: number,
  voterToken: string
) {
  const supabase = await createClient()

  // Guard: match must still be active
  const { data: match } = await supabase
    .from('matches')
    .select('is_completed, team_a_players, team_b_players, team_a_score, team_b_score')
    .eq('id', matchId)
    .single()

  if (!match || match.is_completed) return { error: 'match_not_active' }

  // Guard: player must be on the scoring team
  const teamPlayers = team === 'a' ? match.team_a_players : match.team_b_players
  if (!teamPlayers.includes(playerId)) return { error: 'player_not_on_team' }

  // Guard: score snapshot must match current state (anti-abuse for stale requests)
  if (match.team_a_score !== scoreA || match.team_b_score !== scoreB) {
    return { error: 'score_stale' }
  }

  const { error } = await supabase.from('point_attributions').insert({
    match_id: matchId,
    session_id: sessionId,
    score_a: scoreA,
    score_b: scoreB,
    attributed_to: playerId,
    team,
    voter_token: voterToken,
  })

  // Unique constraint violation = already voted. Not an error from the UX perspective.
  if (error && error.code !== '23505') {
    console.error('Failed to insert attribution:', error)
    return { error: 'insert_failed' }
  }

  return { ok: true }
}
