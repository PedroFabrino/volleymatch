import { SupabaseClient } from '@supabase/supabase-js'
import { Match, PointAttribution } from '../../types/match'
import { calculateBestPartner, detectBiggestComebackAndDiff, calculateTopScorer } from './stat-helpers'

export async function getSessionSummaryData(supabase: SupabaseClient, sessionId: string) {
  const { data: matches } = await supabase
    .from('matches')
    .select('*, match_events(*)')
    .eq('session_id', sessionId)
    .eq('is_completed', true)

  const { data: mmrHistory } = await supabase
    .from('mmr_history')
    .select('player_id, mmr_change, reason')
    .eq('session_id', sessionId)
    .eq('reason', 'match_result')

  const { data: sessionPlayers } = await supabase
    .from('session_players')
    .select('games_played, players ( id, name )')
    .eq('session_id', sessionId)

  const { data: attributions } = await supabase
    .from('point_attributions')
    .select('match_id, score_a, score_b, attributed_to')
    .eq('session_id', sessionId)

  const playersData = sessionPlayers?.map(sp => ({
    id: (sp.players as unknown as { id: string }).id,
    name: (sp.players as unknown as { name: string }).name,
    games_played: sp.games_played
  })) || []

  const mmrGains: Record<string, number> = {}
  mmrHistory?.forEach(row => {
    mmrGains[row.player_id] = (mmrGains[row.player_id] || 0) + row.mmr_change
  })

  const wins: Record<string, number> = {}
  matches?.forEach(match => {
    const winner = match.team_a_score > match.team_b_score ? 'a' : 'b'
    const winningPlayers = winner === 'a' ? match.team_a_players : match.team_b_players
    winningPlayers.forEach((id: string) => {
      wins[id] = (wins[id] || 0) + 1
    })
  })

  const leaderboard = playersData
    .filter(p => p.games_played > 0)
    .map(p => ({
      ...p,
      mmrChange: mmrGains[p.id] || 0,
      wins: wins[p.id] || 0,
      winRate: Math.round(((wins[p.id] || 0) / p.games_played) * 100)
    }))
    .sort((a, b) => b.mmrChange - a.mmrChange)

  const mvp = leaderboard.length > 0 ? leaderboard[0] : null
  const mostGamesPlayed = [...leaderboard].sort((a, b) => b.games_played - a.games_played)[0]

  const { bestPartner, bestPartnerId } = calculateBestPartner(mvp?.id, matches || [], playersData);
  const { maxComeback, biggestComebackMatch, turningPoint, maxDiff, biggestDiffMatch } = detectBiggestComebackAndDiff(matches || []);
  const topScorer = calculateTopScorer((attributions || []) as PointAttribution[], playersData);

  return {
    playersData,
    leaderboard,
    mvp,
    mostGamesPlayed,
    bestPartner,
    bestPartnerId,
    maxComeback,
    biggestComebackMatch: biggestComebackMatch as Match | null,
    turningPoint,
    maxDiff,
    biggestDiffMatch: biggestDiffMatch as Match | null,
    topScorer
  }
}

export async function getGlobalSummaryData(supabase: SupabaseClient, hosterId: string) {
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id')
    .eq('hoster_id', hosterId)

  const sessionIds = sessions?.map(s => s.id) || []

  if (sessionIds.length === 0) {
    return {
      playersData: [],
      leaderboard: [],
      mvp: null,
      mostGamesPlayed: null,
      bestPartner: null,
      bestPartnerId: null,
      maxComeback: 0,
      biggestComebackMatch: null as Match | null,
      turningPoint: { winningScore: 0, losingScore: 0 },
      maxDiff: 0,
      biggestDiffMatch: null as Match | null,
      topScorer: null
    }
  }

  const { data: matches } = await supabase
    .from('matches')
    .select('*, match_events(*)')
    .in('session_id', sessionIds)
    .eq('is_completed', true)

  const { data: mmrHistory } = await supabase
    .from('mmr_history')
    .select('player_id, mmr_change, reason')
    .in('session_id', sessionIds)
    .eq('reason', 'match_result')

  const { data: players } = await supabase
    .from('players')
    .select('id, name')
    .eq('hoster_id', hosterId)

  const { data: attributions } = await supabase
    .from('point_attributions')
    .select('match_id, score_a, score_b, attributed_to')
    .in('session_id', sessionIds)

  const playersData = players || []

  const mmrGains: Record<string, number> = {}
  mmrHistory?.forEach(row => {
    mmrGains[row.player_id] = (mmrGains[row.player_id] || 0) + row.mmr_change
  })

  const wins: Record<string, number> = {}
  const gamesPlayed: Record<string, number> = {}

  matches?.forEach(match => {
    const winner = match.team_a_score > match.team_b_score ? 'a' : 'b'
    const winningPlayers = winner === 'a' ? match.team_a_players : match.team_b_players
    
    match.team_a_players.forEach((id: string) => {
      gamesPlayed[id] = (gamesPlayed[id] || 0) + 1
    })
    match.team_b_players.forEach((id: string) => {
      gamesPlayed[id] = (gamesPlayed[id] || 0) + 1
    })

    winningPlayers.forEach((id: string) => {
      wins[id] = (wins[id] || 0) + 1
    })
  })

  const leaderboard = playersData
    .map(p => {
      const pGamesPlayed = gamesPlayed[p.id] || 0
      return {
        ...p,
        games_played: pGamesPlayed,
        mmrChange: mmrGains[p.id] || 0,
        wins: wins[p.id] || 0,
        winRate: pGamesPlayed > 0 ? Math.round(((wins[p.id] || 0) / pGamesPlayed) * 100) : 0
      }
    })
    .filter(p => p.games_played > 0)
    .sort((a, b) => b.mmrChange - a.mmrChange)

  const mvp = leaderboard.length > 0 ? leaderboard[0] : null
  const mostGamesPlayed = leaderboard.length > 0 ? [...leaderboard].sort((a, b) => b.games_played - a.games_played)[0] : null

  const { bestPartner, bestPartnerId } = calculateBestPartner(mvp?.id, matches || [], playersData);
  const { maxComeback, biggestComebackMatch, turningPoint, maxDiff, biggestDiffMatch } = detectBiggestComebackAndDiff(matches || []);
  const topScorer = calculateTopScorer((attributions || []) as PointAttribution[], playersData);

  return {
    playersData,
    leaderboard,
    mvp,
    mostGamesPlayed,
    bestPartner,
    bestPartnerId,
    maxComeback,
    biggestComebackMatch: biggestComebackMatch as Match | null,
    turningPoint,
    maxDiff,
    biggestDiffMatch: biggestDiffMatch as Match | null,
    topScorer
  }
}
