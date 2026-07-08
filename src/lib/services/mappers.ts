import type { Json } from '@/types/database'
import type { Match, MatchEvent, MatchWithEvents } from '@/types/match'
import type { Session } from '@/types/session'
import { parsePlayerPosition } from '@/types/player'
import type { Database } from '@/types/database'

type MatchEventRow = Database['public']['Tables']['match_events']['Row']

export function parsePositionMap(
  value: Json | null | undefined
): Record<string, import('@/types/player').PlayerPosition> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined

  const result: Record<string, import('@/types/player').PlayerPosition> = {}
  for (const [key, val] of Object.entries(value)) {
    if (typeof val === 'string') {
      const position = parsePlayerPosition(val)
      if (position) result[key] = position
    }
  }
  return Object.keys(result).length > 0 ? result : undefined
}

export function mapMatchRow(
  row: {
    id: string
    session_id: string
    hoster_id: string
    team_a_score: number
    team_b_score: number
    team_a_players: string[]
    team_b_players: string[]
    team_a_positions: Json | null
    team_b_positions: Json | null
    is_completed: boolean
    created_at: string
  }
): Match {
  return {
    id: row.id,
    session_id: row.session_id,
    hoster_id: row.hoster_id,
    team_a_score: row.team_a_score,
    team_b_score: row.team_b_score,
    team_a_players: row.team_a_players,
    team_b_players: row.team_b_players,
    team_a_positions: parsePositionMap(row.team_a_positions),
    team_b_positions: parsePositionMap(row.team_b_positions),
    is_completed: row.is_completed,
    created_at: row.created_at,
  }
}

export function mapMatchEventRow(row: MatchEventRow): MatchEvent {
  const filledPosition = row.filled_position
    ? parsePlayerPosition(row.filled_position)
    : null

  return {
    id: row.id,
    match_id: row.match_id ?? '',
    event_type: row.event_type,
    team: row.team === 'a' || row.team === 'b' ? row.team : undefined,
    increment: row.increment ?? undefined,
    score_a: row.score_a ?? undefined,
    score_b: row.score_b ?? undefined,
    player_out_id: row.player_out_id ?? undefined,
    player_in_id: row.player_in_id ?? undefined,
    filled_position: filledPosition ?? undefined,
    created_at: row.created_at ?? '',
  }
}

export function mapMatchWithEventsRow(
  row: Parameters<typeof mapMatchRow>[0] & { match_events: MatchEventRow[] | null }
): MatchWithEvents {
  return {
    ...mapMatchRow(row),
    match_events: (row.match_events ?? []).map(mapMatchEventRow),
  }
}

export function mapSessionRow(
  row: {
    id: string
    hoster_id: string
    is_active: boolean
    target_score: number
    tie_breaker_rule: string
    created_at: string
    matchmaking_mode: string | null
    pending_draft?: Json | null
    pin?: string | null
  }
): Session {
  return {
    id: row.id,
    hoster_id: row.hoster_id,
    is_active: row.is_active,
    target_score: row.target_score,
    tie_breaker_rule: row.tie_breaker_rule,
    created_at: row.created_at,
    matchmaking_mode: row.matchmaking_mode ?? undefined,
    pending_draft: row.pending_draft ?? undefined,
  }
}

export type SessionWithPin = Session & { pin: string }

export function mapSessionWithPinRow(
  row: Parameters<typeof mapSessionRow>[0] & { pin: string | null }
): SessionWithPin {
  const session = mapSessionRow(row)
  return { ...session, pin: row.pin ?? '' }
}
