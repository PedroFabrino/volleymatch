import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { calculateMmrChanges } from '@/utils/mmr'
import { draftTeams, draftStrictTeams } from '@/utils/matchmaking'

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.BACKGROUND_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { matchId, sessionId, userId } = await request.json()
  if (!matchId || !sessionId || !userId) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: match } = await supabase.from('matches').select('*').eq('id', matchId).single()
  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

  const { data: events } = await supabase.from('match_events').select('*').eq('match_id', matchId).order('created_at', { ascending: true })
  
  const timeline = (events || []).map(e => ({
    team: e.team,
    increment: e.increment,
    scoreA: e.score_a,
    scoreB: e.score_b,
    timestamp: e.created_at,
    type: e.event_type,
    playerOutId: e.player_out_id,
    playerInId: e.player_in_id,
    filledPosition: e.filled_position
  }))

  const playerRecords: Record<string, any> = {}
  const allParticipatingPlayers = new Set([...match.team_a_players, ...match.team_b_players]);
  
  for (const e of timeline) {
    if (e.type === 'substitution') {
      if (e.playerOutId) allParticipatingPlayers.add(e.playerOutId);
      if (e.playerInId) allParticipatingPlayers.add(e.playerInId);
    }
  }

  for (const pid of allParticipatingPlayers) {
    const { data: p } = await supabase.from('players').select('mmr, id, positions').eq('id', pid).single()
    const { data: sp } = await supabase.from('session_players').select('games_played').eq('player_id', pid).eq('session_id', sessionId).maybeSingle()
    if (p) playerRecords[p.id] = { id: p.id, mmr: p.mmr, games_played_today: sp?.games_played ?? 0, positions: p.positions }
  }

  const mmrUpdates = calculateMmrChanges({
    team_a_players: match.team_a_players,
    team_b_players: match.team_b_players,
    team_a_positions: match.team_a_positions,
    team_b_positions: match.team_b_positions,
    team_a_score: match.team_a_score,
    team_b_score: match.team_b_score,
    point_timeline: timeline as any
  }, playerRecords)

  const playerUpdates = mmrUpdates.map((update: any) =>
    supabase.from('players').update({ mmr: update.newMmr }).eq('id', update.playerId)
  )

  const sessionPlayerUpserts = mmrUpdates.map((update: any) =>
    supabase.from('session_players').upsert({
      session_id: sessionId,
      player_id: update.playerId,
      games_played: playerRecords[update.playerId].games_played_today + update.queueIncrement
    }, { onConflict: 'session_id, player_id' })
  )

  const historyInserts = mmrUpdates.map((update: any) => ({
    player_id: update.playerId,
    hoster_id: userId,
    match_id: matchId,
    session_id: sessionId,
    old_mmr: update.oldMmr,
    new_mmr: update.newMmr,
    mmr_change: update.mmrChange,
    reason: 'match_result'
  }))

  await Promise.all([
    ...playerUpdates,
    ...sessionPlayerUpserts,
    historyInserts.length > 0 ? supabase.from('mmr_history').insert(historyInserts) : Promise.resolve()
  ])


  return NextResponse.json({ ok: true })
}
