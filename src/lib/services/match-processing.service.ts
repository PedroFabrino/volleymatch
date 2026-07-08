import type { TypedSupabaseClient } from '@/types/supabase'
import type { Database } from '@/types/database'
import type { MmrUpdateResult } from '@/lib/mmr'

type MmrHistoryInsert = Database['public']['Tables']['mmr_history']['Insert']

export async function getDraftSessionData(
  supabase: TypedSupabaseClient,
  sessionId: string,
  userId: string
) {
  const [
    { data: session },
    { data: presentPlayers },
    { data: sessionPlayers },
  ] = await Promise.all([
    supabase.from('sessions').select('*').eq('id', sessionId).single(),
    supabase.from('players').select('*').eq('hoster_id', userId).eq('is_present_today', true),
    supabase.from('session_players').select('player_id, games_played').eq('session_id', sessionId),
  ])

  return { session, presentPlayers, sessionPlayers }
}

export async function getMatchForProcessing(
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

export async function getMatchEventsOrdered(
  supabase: TypedSupabaseClient,
  matchId: string
) {
  const { data } = await supabase
    .from('match_events')
    .select('*')
    .eq('match_id', matchId)
    .order('created_at', { ascending: true })
  return data || []
}

export async function getPlayersMmrData(
  supabase: TypedSupabaseClient,
  playerIds: string[]
) {
  const { data } = await supabase
    .from('players')
    .select('mmr, id, positions')
    .in('id', playerIds)
  return data || []
}

export async function getSessionPlayersGames(
  supabase: TypedSupabaseClient,
  sessionId: string,
  playerIds: string[]
) {
  const { data } = await supabase
    .from('session_players')
    .select('player_id, games_played')
    .eq('session_id', sessionId)
    .in('player_id', playerIds)
  return data || []
}

export async function applyMmrUpdates(
  supabase: TypedSupabaseClient,
  sessionId: string,
  userId: string,
  matchId: string,
  mmrUpdates: MmrUpdateResult[],
  playerGamesMap: Record<string, number>
) {
  const sessionPlayersDataToUpsert = mmrUpdates.map(update => ({
    session_id: sessionId,
    player_id: update.playerId,
    games_played: playerGamesMap[update.playerId] + update.queueIncrement,
  }))

  const historyInserts: MmrHistoryInsert[] = mmrUpdates.map(update => ({
    player_id: update.playerId,
    hoster_id: userId,
    match_id: matchId,
    session_id: sessionId,
    old_mmr: update.oldMmr,
    new_mmr: update.newMmr,
    mmr_change: update.mmrChange,
    reason: 'match_result',
  }))

  const playerUpdates = mmrUpdates.map(update =>
    supabase.from('players').update({ mmr: update.newMmr }).eq('id', update.playerId)
  )

  await Promise.all([
    ...playerUpdates,
    sessionPlayersDataToUpsert.length > 0
      ? supabase
          .from('session_players')
          .upsert(sessionPlayersDataToUpsert, { onConflict: 'session_id, player_id' })
      : Promise.resolve(),
    historyInserts.length > 0
      ? supabase.from('mmr_history').insert(historyInserts)
      : Promise.resolve(),
  ])
}
