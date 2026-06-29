export type PointEvent = {
  team: 'a' | 'b';
  increment?: number;
  scoreA: number;
  scoreB: number;
  timestamp: string;
  type?: 'substitution' | 'score';
  playerOutId?: string;
  playerInId?: string;
  filledPosition?: string;
};

export type MatchData = {
  team_a_players: string[];
  team_b_players: string[];
  team_a_positions?: Record<string, string>;
  team_b_positions?: Record<string, string>;
  team_a_score: number;
  team_b_score: number;
  point_timeline: PointEvent[];
};

export type PlayerData = {
  id: string;
  mmr: number;
  positions?: string[];
};

export type MmrUpdateResult = {
  playerId: string;
  oldMmr: number;
  newMmr: number;
  mmrChange: number;
  participationFactor: number;
  queueIncrement: number;
};

export function calculateMmrChanges(match: MatchData, players: Record<string, PlayerData>): MmrUpdateResult[] {
  const K_FACTOR = 32;

  // 1. Calculate points played by each player using the timeline
  const pointsPlayed = new Map<string, number>();
  const teamAPlayers = new Set<string>();
  const teamBPlayers = new Set<string>();

  const initialCourtA = new Set(match.team_a_players);
  const initialCourtB = new Set(match.team_b_players);
  const playerPlayedPosition = new Map<string, string>();

  if (match.team_a_positions) {
    for (const [id, pos] of Object.entries(match.team_a_positions)) {
      playerPlayedPosition.set(id, pos);
    }
  }
  if (match.team_b_positions) {
    for (const [id, pos] of Object.entries(match.team_b_positions)) {
      playerPlayedPosition.set(id, pos);
    }
  }

  // Reconstruct initial court state by playing subs backwards
  for (let i = (match.point_timeline || []).length - 1; i >= 0; i--) {
    const event = match.point_timeline[i];
    if (event.type === 'substitution') {
      if (event.team === 'a') {
        initialCourtA.delete(event.playerInId!);
        initialCourtA.add(event.playerOutId!);
      } else {
        initialCourtB.delete(event.playerInId!);
        initialCourtB.add(event.playerOutId!);
      }
      if (event.filledPosition) {
        playerPlayedPosition.set(event.playerOutId!, event.filledPosition);
        playerPlayedPosition.set(event.playerInId!, event.filledPosition);
      }
    }
  }

  const currentCourtA = new Set(initialCourtA);
  const currentCourtB = new Set(initialCourtB);

  // Track everyone who ever played on a team
  currentCourtA.forEach(id => teamAPlayers.add(id));
  currentCourtB.forEach(id => teamBPlayers.add(id));
  
  currentCourtA.forEach(id => pointsPlayed.set(id, 0));
  currentCourtB.forEach(id => pointsPlayed.set(id, 0));

  for (const event of match.point_timeline || []) {
    if (event.type === 'substitution') {
      const outId = event.playerOutId!;
      const inId = event.playerInId!;
      
      if (event.team === 'a') {
        currentCourtA.delete(outId);
        currentCourtA.add(inId);
        teamAPlayers.add(inId);
      } else {
        currentCourtB.delete(outId);
        currentCourtB.add(inId);
        teamBPlayers.add(inId);
      }
      
      if (!pointsPlayed.has(inId)) pointsPlayed.set(inId, 0);

    } else {
      // It's a score event
      const increment = event.increment || 1; 
      const pointsToAdd = increment > 0 ? 1 : (increment < 0 ? -1 : 0);

      if (pointsToAdd !== 0) {
        for (const id of currentCourtA) {
          pointsPlayed.set(id, Math.max(0, (pointsPlayed.get(id) || 0) + pointsToAdd));
        }
        for (const id of currentCourtB) {
          pointsPlayed.set(id, Math.max(0, (pointsPlayed.get(id) || 0) + pointsToAdd));
        }
      }
    }
  }

  const totalPoints = match.team_a_score + match.team_b_score;

  if (totalPoints === 0) {
    return Object.values(players).map(p => {
      const isOnCourt = initialCourtA.has(p.id) || initialCourtB.has(p.id);
      return {
        playerId: p.id,
        oldMmr: p.mmr,
        newMmr: p.mmr,
        mmrChange: 0,
        participationFactor: isOnCourt ? 1 : 0,
        queueIncrement: isOnCourt ? 1 : 0
      };
    });
  }

  // 2. Calculate Weighted Team MMRs
  let teamAMmrSum = 0;
  let teamAPointsSum = 0;
  for (const id of teamAPlayers) {
    const pts = pointsPlayed.get(id) || 0;
    const mmr = players[id]?.mmr || 1200;
    teamAMmrSum += mmr * pts;
    teamAPointsSum += pts;
  }
  const avgTeamAMmr = teamAPointsSum > 0 ? teamAMmrSum / teamAPointsSum : 1200;

  let teamBMmrSum = 0;
  let teamBPointsSum = 0;
  for (const id of teamBPlayers) {
    const pts = pointsPlayed.get(id) || 0;
    const mmr = players[id]?.mmr || 1200;
    teamBMmrSum += mmr * pts;
    teamBPointsSum += pts;
  }
  const avgTeamBMmr = teamBPointsSum > 0 ? teamBMmrSum / teamBPointsSum : 1200;

  // 3. Elo Expected Probabilities
  const expectedA = 1 / (1 + Math.pow(10, (avgTeamBMmr - avgTeamAMmr) / 400));
  const expectedB = 1 - expectedA;

  // Actual outcomes (1 for win, 0 for loss, 0.5 for draw)
  let actualA = 0.5;
  let actualB = 0.5;
  if (match.team_a_score > match.team_b_score) {
    actualA = 1;
    actualB = 0;
  } else if (match.team_b_score > match.team_a_score) {
    actualA = 0;
    actualB = 1;
  }

  // 4. Point Difference Multiplier (blowout modifier)
  const pointDiff = Math.abs(match.team_a_score - match.team_b_score);
  const diffMultiplier = match.team_a_score === match.team_b_score ? 1 : Math.max(1, Math.log(pointDiff + 1));

  // Base MMR shifts for the teams
  const teamAShift = K_FACTOR * diffMultiplier * (actualA - expectedA);
  const teamBShift = K_FACTOR * diffMultiplier * (actualB - expectedB);

  // 5. Apply shifts to individual players based on participation
  const isFill = (playerId: string) => {
    const pos = playerPlayedPosition.get(playerId);
    if (!pos || pos === 'Any') return false; 
    const prefs = players[playerId]?.positions || [];
    if (prefs.length === 0) return false; 
    return !prefs.includes(pos);
  };

  const results: MmrUpdateResult[] = [];
  const allParticipatingPlayers = new Set([...teamAPlayers, ...teamBPlayers]);

  for (const id of allParticipatingPlayers) {
    const isTeamA = teamAPlayers.has(id);
    const teamShift = isTeamA ? teamAShift : teamBShift;
    const pts = pointsPlayed.get(id) || 0;
    
    // Scaling factor (0 to 1) based on how many points they were on the court for
    const participationFactor = pts / totalPoints;
    
    let actualShift = Math.round(teamShift * participationFactor);
    
    // Fill Bonus
    if (isFill(id)) {
      if (actualShift > 0) {
        actualShift = Math.round(actualShift * 1.2) + 5; // Extra +5 and 20% boost for win
      } else if (actualShift < 0) {
        actualShift = Math.min(0, Math.round(actualShift * 0.8) + 5); // 20% reduction in loss and +5 forgiveness
      } else {
        actualShift += 5; // Flat +5 if 0
      }
    }

    const oldMmr = players[id]?.mmr || 1200;
    const newMmr = Math.max(0, oldMmr + actualShift); // Prevent negative MMR

    let queueIncrement = participationFactor;
    const startedMatch = initialCourtA.has(id) || initialCourtB.has(id);
    
    if (!startedMatch) {
       if (!isFill(id)) {
         queueIncrement = 0; // Maintain queue priority if subbed into preferred position
       }
    }

    results.push({
      playerId: id,
      oldMmr,
      newMmr,
      mmrChange: newMmr - oldMmr,
      participationFactor,
      queueIncrement
    });
  }

  return results;
}
