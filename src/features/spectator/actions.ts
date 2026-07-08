'use server'

import { createClient } from '@/lib/supabase/server'
import { getMatchForAttribution, insertPointAttribution } from '@/lib/services'

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

  const match = await getMatchForAttribution(supabase, matchId)

  if (!match || match.is_completed) return { error: 'match_not_active' }

  const teamPlayers = team === 'a' ? match.team_a_players : match.team_b_players
  if (!teamPlayers.includes(playerId)) return { error: 'player_not_on_team' }

  if (match.team_a_score !== scoreA || match.team_b_score !== scoreB) {
    return { error: 'score_stale' }
  }

  const { error } = await insertPointAttribution(supabase, {
    match_id: matchId,
    session_id: sessionId,
    score_a: scoreA,
    score_b: scoreB,
    attributed_to: playerId,
    team,
    voter_token: voterToken,
  })

  if (error && error.code !== '23505') {
    console.error('Failed to insert attribution:', error)
    return { error: 'insert_failed' }
  }

  return { ok: true }
}
