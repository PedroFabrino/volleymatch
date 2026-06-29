export type Player = {
  id: string;
  name: string;
  mmr: number;
  positions: string[];
  active_positions: string[] | null;
  games_played_today: number;
};

export function isSetter(player: Player): boolean {
  const pos = player.active_positions && player.active_positions.length > 0 ? player.active_positions : player.positions;
  return pos?.includes('Setter') || false;
}

export function draftTeams(playersToDraft: Player[]): { teamA: string[], teamB: string[] } {
  const teamA: Player[] = [];
  const teamB: Player[] = [];

  // Separate setters and non-setters
  const setters = playersToDraft.filter(isSetter).sort((a, b) => b.mmr - a.mmr);
  const nonSetters = playersToDraft.filter(p => !isSetter(p)).sort((a, b) => b.mmr - a.mmr);

  const getTeamMmr = (team: Player[]) => team.reduce((sum, p) => sum + p.mmr, 0);

  // Distribute setters evenly
  for (const setter of setters) {
    const mmrA = getTeamMmr(teamA);
    const mmrB = getTeamMmr(teamB);

    if (teamA.length < 6 && (teamA.length < teamB.length || (teamA.length === teamB.length && mmrA <= mmrB))) {
      teamA.push(setter);
    } else if (teamB.length < 6) {
      teamB.push(setter);
    } else {
      teamA.push(setter); // fallback
    }
  }

  let teamAMissingSetter = teamA.filter(isSetter).length === 0;
  let teamBMissingSetter = teamB.filter(isSetter).length === 0;

  // Distribute non-setters
  for (const player of nonSetters) {
    const rawMmrA = getTeamMmr(teamA);
    const rawMmrB = getTeamMmr(teamB);

    const effectiveMmrA = teamAMissingSetter ? rawMmrA * 0.9 : rawMmrA;
    const effectiveMmrB = teamBMissingSetter ? rawMmrB * 0.9 : rawMmrB;

    if (teamA.length < 6 && (teamA.length < teamB.length || (teamA.length === teamB.length && effectiveMmrA <= effectiveMmrB))) {
      teamA.push(player);
    } else if (teamB.length < 6) {
      teamB.push(player);
    } else {
      teamA.push(player); // fallback
    }
  }

  return { 
    teamA: teamA.map(p => p.id), 
    teamB: teamB.map(p => p.id) 
  };
}

export function draftStrictTeams(allAvailablePlayers: Player[], lastMatchWinningTeamIds: string[], lastMatchLosingTeamIds: string[]): { teamA: string[], teamB: string[] } {
  // We need exactly 14 players total. 
  // Composition per team: 1 Setter, 2 Outside Hitter, 1 Opposite, 2 Middle Blocker, 1 Libero
  const blueprint = [
    { pos: 'Setter', count: 2 },
    { pos: 'Outside Hitter', count: 4 },
    { pos: 'Opposite', count: 2 },
    { pos: 'Middle Blocker', count: 4 },
    { pos: 'Libero', count: 2 }
  ];

  // Helper to get effective positions
  const getPos = (p: Player) => (p.active_positions && p.active_positions.length > 0) ? p.active_positions : p.positions;
  const hasPos = (p: Player, pos: string) => getPos(p).includes(pos);

  // Sorting function to pick the "most deserving" players
  const sortByDeserving = (a: Player, b: Player) => {
    // 1. Lowest games played today gets priority
    if (a.games_played_today !== b.games_played_today) {
      return a.games_played_today - b.games_played_today;
    }
    
    // 2. If tied, Winners of last match get priority over losers
    const aIsWinner = lastMatchWinningTeamIds.includes(a.id);
    const bIsWinner = lastMatchWinningTeamIds.includes(b.id);
    const aIsLoser = lastMatchLosingTeamIds.includes(a.id);
    const bIsLoser = lastMatchLosingTeamIds.includes(b.id);
    
    const aPriority = aIsWinner ? 2 : (aIsLoser ? 1 : 0); // (0 means queue, but queue would win on games_played_today)
    const bPriority = bIsWinner ? 2 : (bIsLoser ? 1 : 0);
    
    if (aPriority !== bPriority) {
      return bPriority - aPriority; // higher priority first
    }
    
    // 3. If still tied, we don't sort by MMR here. We keep them together and we'll evaluate combinations later for balancing.
    return 0; // For now, just keep stable order. 
  };

  let selectedPlayers: Player[] = [];
  let remainingPlayers = [...allAvailablePlayers].sort(sortByDeserving);

  // Greedy Assignment based on blueprint
  for (const requirement of blueprint) {
    const candidates = remainingPlayers.filter(p => hasPos(p, requirement.pos));
    // Take the top 'count' candidates
    const picked = candidates.slice(0, requirement.count);
    
    selectedPlayers.push(...picked);
    
    // Remove picked from remaining
    remainingPlayers = remainingPlayers.filter(p => !picked.includes(p));
  }

  // Fallback: If we didn't fill all 14 slots because we lack specific positions, just grab anyone remaining to fill to 14
  if (selectedPlayers.length < 14) {
    const needed = 14 - selectedPlayers.length;
    const fallbacks = remainingPlayers.slice(0, needed);
    selectedPlayers.push(...fallbacks);
  }

  // Now we have up to 14 players. We need to split them into Team A and Team B to balance MMR perfectly!
  // Simple greedy split balancing total MMR
  const teamA: Player[] = [];
  const teamB: Player[] = [];
  
  // Sort selected by MMR descending for greedy distribution
  selectedPlayers.sort((a, b) => b.mmr - a.mmr);

  const getTeamMmr = (t: Player[]) => t.reduce((s, p) => s + p.mmr, 0);

  // Try to enforce 1 setter per team during split
  const setters = selectedPlayers.filter(p => hasPos(p, 'Setter'));
  const others = selectedPlayers.filter(p => !hasPos(p, 'Setter'));

  for (const s of setters) {
    if (teamA.length < 7 && (teamA.length < teamB.length || (teamA.length === teamB.length && getTeamMmr(teamA) <= getTeamMmr(teamB)))) {
      teamA.push(s);
    } else if (teamB.length < 7) {
      teamB.push(s);
    } else {
      teamA.push(s);
    }
  }

  for (const p of others) {
    if (teamA.length < 7 && (teamA.length < teamB.length || (teamA.length === teamB.length && getTeamMmr(teamA) <= getTeamMmr(teamB)))) {
      teamA.push(p);
    } else if (teamB.length < 7) {
      teamB.push(p);
    } else {
      teamA.push(p);
    }
  }

  return {
    teamA: teamA.map(p => p.id),
    teamB: teamB.map(p => p.id)
  };
}
