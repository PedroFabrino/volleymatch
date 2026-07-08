import type { TypedSupabaseClient } from '@/types/supabase'
import type { Json, Database } from '@/types/database'

type SessionInsert = Database['public']['Tables']['sessions']['Insert']
type MmrHistoryInsert = Database['public']['Tables']['mmr_history']['Insert']

export async function storeSummaryData(
  supabase: TypedSupabaseClient,
  sessionId: string,
  summaryData: unknown
): Promise<void> {
  await supabase
    .from('sessions')
    .update({ summary_data: summaryData as Json })
    .eq('id', sessionId)
}

export async function updatePendingDraft(
  supabase: TypedSupabaseClient,
  sessionId: string,
  draft: unknown
) {
  await supabase
    .from('sessions')
    .update({ pending_draft: draft as Json })
    .eq('id', sessionId)
}

export async function clearPendingDraftForActiveSession(
  supabase: TypedSupabaseClient,
  hosterId: string
) {
  await supabase
    .from('sessions')
    .update({ pending_draft: null })
    .eq('hoster_id', hosterId)
    .eq('is_active', true)
}

export async function deactivateAllSessions(
  supabase: TypedSupabaseClient,
  hosterId: string
) {
  await supabase
    .from('sessions')
    .update({ is_active: false })
    .eq('hoster_id', hosterId)
}

export async function createSession(
  supabase: TypedSupabaseClient,
  sessionData: SessionInsert
) {
  const { data, error } = await supabase
    .from('sessions')
    .insert(sessionData)
    .select()
    .single()
  return { data, error }
}

export async function endSessionRecord(
  supabase: TypedSupabaseClient,
  sessionId: string,
  hosterId: string,
  summaryData: unknown
) {
  await supabase
    .from('sessions')
    .update({
      is_active: false,
      summary_data: summaryData as Json,
    })
    .eq('id', sessionId)
    .eq('hoster_id', hosterId)
}

export async function initializeSessionPlayers(
  supabase: TypedSupabaseClient,
  sessionId: string,
  playerIds: string[]
) {
  await supabase.from('session_players').insert(
    playerIds.map(playerId => ({
      session_id: sessionId,
      player_id: playerId,
      games_played: 0,
    }))
  )
}

export async function insertMmrHistorySnapshot(
  supabase: TypedSupabaseClient,
  records: MmrHistoryInsert[]
) {
  await supabase.from('mmr_history').insert(records)
}

export async function addPlayerToSession(
  supabase: TypedSupabaseClient,
  sessionId: string,
  playerId: string,
  gamesPlayed: number
) {
  const { error } = await supabase.from('session_players').upsert(
    { session_id: sessionId, player_id: playerId, games_played: gamesPlayed },
    { onConflict: 'session_id, player_id', ignoreDuplicates: true }
  )
  return { error }
}
