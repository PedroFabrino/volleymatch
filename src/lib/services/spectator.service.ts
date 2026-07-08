import type { TypedSupabaseClient } from '@/types/supabase'
import type { SessionWithPin } from '@/lib/services/mappers'
import type { Match } from '@/types/match'
import type { PlayerWithStatus } from '@/lib/matchmaking'
import { previewNextDraft, sortPlayersByDraftPriority } from '@/lib/matchmaking'
import {
  getSessionByPin,
  getActiveMatchForSession,
  getPresentPlayersByHoster,
  getSessionPlayersList,
  getLastCompletedMatchForSession,
} from '@/lib/services'

export type SpectatorViewData = {
  session: SessionWithPin
  activeMatch: Match | null
  playersWithStatus: PlayerWithStatus[]
}

export async function getSpectatorViewData(
  supabase: TypedSupabaseClient,
  adminSupabase: TypedSupabaseClient,
  pin: string
): Promise<{ data: SpectatorViewData | null; error: unknown }> {
  const { data: session, error } = await getSessionByPin(supabase, pin)

  if (error || !session) {
    return { data: null, error }
  }

  const [activeMatch, rawPlayers, sessionPlayers, lastCompletedMatch] = await Promise.all([
    getActiveMatchForSession(supabase, session.id),
    getPresentPlayersByHoster(adminSupabase, session.hoster_id),
    getSessionPlayersList(adminSupabase, session.id),
    getLastCompletedMatchForSession(supabase, session.id),
  ])

  const players = rawPlayers.map(p => {
    const sp = sessionPlayers.find(sp => sp.player_id === p.id)
    return {
      ...p,
      games_played_today: sp ? sp.games_played : 0,
    }
  })

  const lastWinners = activeMatch
    ? activeMatch.team_a_players
    : lastCompletedMatch?.team_a_players ?? []

  const lastLosers = activeMatch
    ? activeMatch.team_b_players
    : lastCompletedMatch?.team_b_players ?? []

  const isFirstMatch = lastWinners.length === 0 && lastLosers.length === 0
  const sortedPlayers = [...players].sort((a, b) =>
    sortPlayersByDraftPriority(a, b, isFirstMatch)
  )

  const playersWithStatus = previewNextDraft(
    sortedPlayers,
    lastWinners,
    lastLosers,
    session.matchmaking_mode === 'strict'
  )

  return {
    data: { session, activeMatch, playersWithStatus },
    error: null,
  }
}
