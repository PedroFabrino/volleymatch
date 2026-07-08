import { Match, MatchEvent } from '../../types/match'

export function calculateBestPartner(mvpId: string | undefined, matches: Match[], playersData: { id: string, name: string }[]) {
  let bestPartner: { name: string, wins: number } | null = null;
  let bestPartnerId: string | null = null;
  
  if (mvpId) {
    const partnerWins: Record<string, number> = {};
    matches?.forEach(match => {
      const winner = match.team_a_score > match.team_b_score ? 'a' : 'b';
      const winningTeam = winner === 'a' ? match.team_a_players : match.team_b_players;
      if (winningTeam.includes(mvpId)) {
        winningTeam.forEach((pid: string) => {
          if (pid !== mvpId) {
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
  
  return { bestPartner, bestPartnerId };
}

export function detectBiggestComebackAndDiff(matches: Match[]) {
  let maxComeback = 0
  let biggestComebackMatch: Match | null = null
  let turningPoint = { winningScore: 0, losingScore: 0 }

  let maxDiff = 0
  let biggestDiffMatch: Match | null = null

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

      match.match_events.forEach((event: MatchEvent) => {
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

  return { maxComeback, biggestComebackMatch, turningPoint, maxDiff, biggestDiffMatch };
}

export function calculateTopScorer(attributions: any[], playersData: { id: string, name: string }[]) {
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
  
  return topScorer;
}
