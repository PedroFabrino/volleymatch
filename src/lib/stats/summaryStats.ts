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

  // 4. Fetch point attributions
  const { data: attributions } = await supabase
    .from('point_attributions')
    .select('match_id, score_a, score_b, attributed_to')
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

  // --- Top Scorer ---
  let topScorer: { id: string, name: string, points: number } | null = null;
  if (attributions && attributions.length > 0) {
    const pointVotes: Record<string, Record<string, number>> = {};
    attributions.forEach(attr => {
      const pointKey = `${attr.match_id}_${attr.score_a}_${attr.score_b}`;
      if (!pointVotes[pointKey]) pointVotes[pointKey] = {};
      pointVotes[pointKey][attr.attributed_to] = (pointVotes[pointKey][attr.attributed_to] || 0) + 1;
    });

    const playerScores: Record<string, number> = {};
    Object.values(pointVotes).forEach(votes => {
      let maxVotes = 0;
      let winnerId: string | null = null;
      Object.entries(votes).forEach(([playerId, count]) => {
        if (count > maxVotes) {
          maxVotes = count;
          winnerId = playerId;
        }
      });
      if (winnerId) {
        playerScores[winnerId] = (playerScores[winnerId] || 0) + 1;
      }
    });

    let maxPoints = 0;
    let topScorerId: string | null = null;
    Object.entries(playerScores).forEach(([playerId, points]) => {
      if (points > maxPoints) {
        maxPoints = points;
        topScorerId = playerId;
      }
    });

    if (topScorerId) {
      const pData = playersData.find(p => p.id === topScorerId);
      if (pData) {
        topScorer = { id: pData.id, name: pData.name, points: maxPoints };
      }
    }
  }

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
    biggestDiffMatch,
    topScorer
  }
}

export async function getGlobalSummaryData(supabase: SupabaseClient, hosterId: string) {
  // 1. Fetch all sessions for this hoster
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
      biggestComebackMatch: null,
      turningPoint: { winningScore: 0, losingScore: 0 },
      maxDiff: 0,
      biggestDiffMatch: null,
      topScorer: null
    }
  }

  // 2. Fetch all completed matches across these sessions
  const { data: matches } = await supabase
    .from('matches')
    .select('*, match_events(*)')
    .in('session_id', sessionIds)
    .eq('is_completed', true)

  // 3. Fetch mmr history for all these sessions
  const { data: mmrHistory } = await supabase
    .from('mmr_history')
    .select('player_id, mmr_change, reason')
    .in('session_id', sessionIds)
    .eq('reason', 'match_result')

  // 4. Fetch all players for this hoster
  const { data: players } = await supabase
    .from('players')
    .select('id, name')
    .eq('hoster_id', hosterId)

  // 5. Fetch point attributions across these sessions
  const { data: attributions } = await supabase
    .from('point_attributions')
    .select('match_id, score_a, score_b, attributed_to')
    .in('session_id', sessionIds)

  const playersData = players || []

  // --- Calculate MVP & Leaderboard ---
  const mmrGains: Record<string, number> = {}
  mmrHistory?.forEach(row => {
    mmrGains[row.player_id] = (mmrGains[row.player_id] || 0) + row.mmr_change
  })

  const wins: Record<string, number> = {}
  const gamesPlayed: Record<string, number> = {}

  matches?.forEach(match => {
    const winner = match.team_a_score > match.team_b_score ? 'a' : 'b'
    const winningPlayers = winner === 'a' ? match.team_a_players : match.team_b_players
    
    // Count games played for all players in this match
    match.team_a_players.forEach((id: string) => {
      gamesPlayed[id] = (gamesPlayed[id] || 0) + 1
    })
    match.team_b_players.forEach((id: string) => {
      gamesPlayed[id] = (gamesPlayed[id] || 0) + 1
    })

    // Count wins
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

  // --- Top Scorer ---
  let topScorer: { id: string, name: string, points: number } | null = null;
  if (attributions && attributions.length > 0) {
    const pointVotes: Record<string, Record<string, number>> = {};
    attributions.forEach(attr => {
      const pointKey = `${attr.match_id}_${attr.score_a}_${attr.score_b}`;
      if (!pointVotes[pointKey]) pointVotes[pointKey] = {};
      pointVotes[pointKey][attr.attributed_to] = (pointVotes[pointKey][attr.attributed_to] || 0) + 1;
    });

    const playerScores: Record<string, number> = {};
    Object.values(pointVotes).forEach(votes => {
      let maxVotes = 0;
      let winnerId: string | null = null;
      Object.entries(votes).forEach(([playerId, count]) => {
        if (count > maxVotes) {
          maxVotes = count;
          winnerId = playerId;
        }
      });
      if (winnerId) {
        playerScores[winnerId] = (playerScores[winnerId] || 0) + 1;
      }
    });

    let maxPoints = 0;
    let topScorerId: string | null = null;
    Object.entries(playerScores).forEach(([playerId, points]) => {
      if (points > maxPoints) {
        maxPoints = points;
        topScorerId = playerId;
      }
    });

    if (topScorerId) {
      const pData = playersData.find(p => p.id === topScorerId);
      if (pData) {
        topScorer = { id: pData.id, name: pData.name, points: maxPoints };
      }
    }
  }

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
    biggestDiffMatch,
    topScorer
  }
}

export function computeDashboardStats(players: any[], completedMatches: any[]) {
  const playerStats: Record<string, { matches: number; wins: number; name: string, mmr: number }> = {}
  
  if (players) {
    players.forEach(p => {
      playerStats[p.id] = { matches: 0, wins: 0, name: p.name, mmr: p.mmr }
    })
  }

  if (completedMatches) {
    completedMatches.forEach(match => {
      const teamAWon = match.team_a_score > match.team_b_score
      const teamBWon = match.team_b_score > match.team_a_score

      match.team_a_players.forEach((pid: string) => {
        if (playerStats[pid]) {
          playerStats[pid].matches += 1
          if (teamAWon) playerStats[pid].wins += 1
        }
      })
      match.team_b_players.forEach((pid: string) => {
        if (playerStats[pid]) {
          playerStats[pid].matches += 1
          if (teamBWon) playerStats[pid].wins += 1
        }
      })
    })
  }

  // Sort players by Wins, then by MMR
  const rankedPlayers = Object.values(playerStats)
    .filter(p => p.matches > 0)
    .sort((a, b) => b.wins - a.wins || b.mmr - a.mmr)
    .slice(0, 5) // Top 5

  const latestMatches = completedMatches ? completedMatches.slice(0, 5) : []
  
  return { playerStats, rankedPlayers, latestMatches }
}
