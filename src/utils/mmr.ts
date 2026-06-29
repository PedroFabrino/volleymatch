export type PointEvent = {
  team: 'a' | 'b';
  increment?: number;
  scoreA: number;
  scoreB: number;
  timestamp: string;
  type?: 'substitution';
  playerOutId?: string;
  playerInId?: string;
};

export type MatchData = {
  team_a_players: string[];
  team_b_players: string[];
  team_a_score: number;
  team_b_score: number;
  point_timeline: PointEvent[];
};

export type PlayerData = {
  id: string;
  mmr: number;
};

export type MmrUpdateResult = {
  playerId: string;
  oldMmr: number;
  newMmr: number;
  mmrChange: number;
  participationFactor: number;
};

export function calculateMmrChanges(match: MatchData, players: Record<string, PlayerData>): MmrUpdateResult[] {
  const K_FACTOR = 32;

  // 1. Calculate points played by each player using the timeline
  const pointsPlayed = new Map<string, number>();
  const teamAPlayers = new Set<string>();
  const teamBPlayers = new Set<string>();

  const currentCourtA = new Set(match.team_a_players);
  const currentCourtB = new Set(match.team_b_players);

  // Track everyone who ever played on a team
  match.team_a_players.forEach(id => teamAPlayers.add(id));
  match.team_b_players.forEach(id => teamBPlayers.add(id));
  
  match.team_a_players.forEach(id => pointsPlayed.set(id, 0));
  match.team_b_players.forEach(id => pointsPlayed.set(id, 0));

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

  // If match was 0-0, no MMR changes
  if (totalPoints === 0) {
    return Object.values(players).map(p => ({
      playerId: p.id,
      oldMmr: p.mmr,
      newMmr: p.mmr,
      mmrChange: 0,
      participationFactor: 0
    }));
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
  // loge(point_diff + 1). So diff of 2 points ~ 1.1x. diff of 10 points ~ 2.4x
  const pointDiff = Math.abs(match.team_a_score - match.team_b_score);
  const diffMultiplier = match.team_a_score === match.team_b_score ? 1 : Math.max(1, Math.log(pointDiff + 1));

  // Base MMR shifts for the teams
  const teamAShift = K_FACTOR * diffMultiplier * (actualA - expectedA);
  const teamBShift = K_FACTOR * diffMultiplier * (actualB - expectedB);

  // 5. Apply shifts to individual players based on participation
  const results: MmrUpdateResult[] = [];
  const allParticipatingPlayers = new Set([...teamAPlayers, ...teamBPlayers]);

  for (const id of allParticipatingPlayers) {
    const isTeamA = teamAPlayers.has(id);
    const teamShift = isTeamA ? teamAShift : teamBShift;
    const pts = pointsPlayed.get(id) || 0;
    
    // Scaling factor (0 to 1) based on how many points they were on the court for
    const participationFactor = pts / totalPoints;
    
    const actualShift = Math.round(teamShift * participationFactor);
    const oldMmr = players[id]?.mmr || 1200;
    const newMmr = Math.max(0, oldMmr + actualShift); // Prevent negative MMR

    results.push({
      playerId: id,
      oldMmr,
      newMmr,
      mmrChange: newMmr - oldMmr,
      participationFactor
    });
  }

  return results;
}
