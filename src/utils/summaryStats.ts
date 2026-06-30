import { SupabaseClient } from '@supabase/supabase-js'

export async function getSessionSummaryData(supabase: SupabaseClient, sessionId: string) {
  // 1. Fetch all completed matches
  const { data: matches } = await supabase
    .from('matches')
    .select('*, match_events(*)')
    .eq('session_id', sessionId)
    .eq('is_completed', true)

  // 2. Fetch mmr history for this session
  const { data: mmrHistory } = await supabase
    .from('mmr_history')
    .select('player_id, mmr_change, reason')
    .eq('session_id', sessionId)
    .eq('reason', 'match_result')

  // 3. Fetch session players to get names and games_played
  const { data: sessionPlayers } = await supabase
    .from('session_players')
    .select('games_played, players ( id, name )')
    .eq('session_id', sessionId)

  const playersData = sessionPlayers?.map(sp => ({
    id: (sp.players as any).id,
    name: (sp.players as any).name,
    games_played: sp.games_played
  })) || []

  // --- Calculate MVP & Leaderboard ---
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

  // --- MVP Extras ---
  let bestPartner: { name: string, wins: number } | null = null;
  let bestPartnerId: string | null = null;
  if (mvp) {
    const partnerWins: Record<string, number> = {};
    matches?.forEach(match => {
      const winner = match.team_a_score > match.team_b_score ? 'a' : 'b';
      const winningTeam = winner === 'a' ? match.team_a_players : match.team_b_players;
      if (winningTeam.includes(mvp.id)) {
        winningTeam.forEach((pid: string) => {
          if (pid !== mvp.id) {
            partnerWins[pid] = (partnerWins[pid] || 0) + 1;
          }
        });
      }
    });
    
    let maxWins = 0;
    Object.entries(partnerWins).forEach(([pid, w]) => {
      if (w > maxWins) {
        maxWins = w;
        bestPartnerId = pid;
      }
    });

    if (bestPartnerId) {
      const pData = playersData.find(p => p.id === bestPartnerId);
      if (pData) bestPartner = { name: pData.name, wins: maxWins };
    }
  }

  // --- Biggest Comeback & Difference ---
  let maxComeback = 0
  let biggestComebackMatch: any = null
  let turningPoint = { winningScore: 0, losingScore: 0 }

  let maxDiff = 0
  let biggestDiffMatch: any = null

  matches?.forEach(match => {
    const diff = Math.abs(match.team_a_score - match.team_b_score)
    if (diff > maxDiff) {
      maxDiff = diff
      biggestDiffMatch = match
    }

    if (match.match_events && match.match_events.length > 0) {
      let maxDeficitForWinner = 0;
      let localTurningPoint = { winningScore: 0, losingScore: 0 };
      
      const winner = match.team_a_score > match.team_b_score ? 'a' : 'b';

      match.match_events.forEach((event: any) => {
        if (event.event_type === 'score' && event.score_a !== undefined && event.score_b !== undefined) {
          if (winner === 'a') {
            const deficit = event.score_b - event.score_a;
            if (deficit > maxDeficitForWinner) {
              maxDeficitForWinner = deficit;
              localTurningPoint = { winningScore: event.score_a, losingScore: event.score_b };
            }
          } else {
            const deficit = event.score_a - event.score_b;
            if (deficit > maxDeficitForWinner) {
              maxDeficitForWinner = deficit;
              localTurningPoint = { winningScore: event.score_b, losingScore: event.score_a };
            }
          }
        }
      });

      if (maxDeficitForWinner > maxComeback) {
        maxComeback = maxDeficitForWinner;
        biggestComebackMatch = match;
        turningPoint = localTurningPoint;
      }
    }
  })

  return {
    playersData,
    leaderboard,
    mvp,
    mostGamesPlayed,
    bestPartner,
    bestPartnerId,
    maxComeback,
    biggestComebackMatch,
    turningPoint,
    maxDiff,
    biggestDiffMatch
  }
}
