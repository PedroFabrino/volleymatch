import type { TypedSupabaseClient } from '@/types/supabase'
import { previewNextDraft, orderPlayersForQueuePreview } from '@/lib/matchmaking'
import type { Player as MatchmakingPlayer, PlayerWithStatus } from '@/lib/matchmaking'
import type { Player } from '@/types/player'
import { parsePlayerPositions } from '@/types/player'
import type { Match } from '@/types/match'
import { mapSessionRow, mapSessionWithPinRow, mapMatchRow } from './mappers'

export async function getActiveSession(supabase: TypedSupabaseClient, userId: string) {
  const { data } = await supabase
    .from('sessions')
    .select('id, pin')
    .eq('hoster_id', userId)
    .eq('is_active', true)
    .maybeSingle()
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

export type LiveSessionPlayer = Player & { games_played_today: number }

function toMatchmakingPlayer(player: LiveSessionPlayer): MatchmakingPlayer {
  return {
    id: player.id,
    name: player.name,
    mmr: player.mmr,
    positions: player.positions,
    active_positions: player.active_positions ?? null,
    games_played_today: player.games_played_today,
  }
}

export type LiveSessionViewData = {
  session: NonNullable<Awaited<ReturnType<typeof getLiveSessionData>>['session']>
  activeMatch: Match | null
  playersWithGames: LiveSessionPlayer[]
  playersWithStatus: PlayerWithStatus[]
  isFirstMatch: boolean
}

export async function getLiveSessionViewData(
  supabase: TypedSupabaseClient,
  sessionId: string,
  userId: string
): Promise<LiveSessionViewData | null> {
  const { session, activeMatch, players, sessionPlayersData, completedMatchesCount } =
    await getLiveSessionData(supabase, sessionId, userId)

  if (!session) return null

  const playersWithGames: LiveSessionPlayer[] = (players || []).map(row => {
    const sp = sessionPlayersData?.find(sp => sp.player_id === row.id)
    return {
      id: row.id,
      name: row.name,
      mmr: row.mmr,
      hoster_id: row.hoster_id,
      is_present_today: row.is_present_today,
      is_temporary: row.is_temporary,
      positions: parsePlayerPositions(row.positions),
      active_positions: row.active_positions ? parsePlayerPositions(row.active_positions) : null,
      initial_tier: row.initial_tier ?? undefined,
      games_played_today: sp?.games_played ?? 0
    }
  })

  const isFirstMatch = (completedMatchesCount ?? 0) === 0
  const lastWinners = activeMatch ? activeMatch.team_a_players : []
  const lastLosers = activeMatch ? activeMatch.team_b_players : []

  const sortedPlayers = orderPlayersForQueuePreview(
    playersWithGames.filter(p => p.is_present_today).map(toMatchmakingPlayer),
    lastWinners,
    lastLosers,
  )

  const playersWithStatus = previewNextDraft(
    sortedPlayers,
    lastWinners,
    lastLosers,
    session.matchmaking_mode === 'strict'
  )

  return {
    session,
    activeMatch,
    playersWithGames,
    playersWithStatus,
    isFirstMatch,
  }
}
