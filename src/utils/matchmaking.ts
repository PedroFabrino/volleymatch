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

export function draftStrictTeams(allAvailablePlayers: Player[], lastMatchWinningTeamIds: string[], lastMatchLosingTeamIds: string[]): { teamA: string[], teamB: string[], teamAPositions: Record<string, string>, teamBPositions: Record<string, string> } {
  // We need exactly 14 players total. 
  // Composition per team: 1 Setter, 2 Outside Hitter, 1 Opposite, 2 Middle Blocker, 1 Libero
  // Helper to get effective positions
  const getPos = (p: Player) => (p.active_positions && p.active_positions.length > 0) ? p.active_positions : p.positions;
  const hasPos = (p: Player, pos: string | string[]) => {
    const pPos = getPos(p);
    if (Array.isArray(pos)) return pos.some(x => pPos.includes(x));
    return pPos.includes(pos);
  };

  // Determine if we have enough MBs and Liberos for 7v7
  // 7v7 needs 4 MBs + 2 Liberos = 6 total from these positions
  const availableMBs = allAvailablePlayers.filter(p => hasPos(p, 'Middle Blocker'));
  const availableLiberos = allAvailablePlayers.filter(p => hasPos(p, 'Libero') && !hasPos(p, 'Middle Blocker')); // avoid double counting
  const totalMBL = availableMBs.length + availableLiberos.length;

  let targetSize = 7;
  let totalPlayersNeeded = 14;
  let blueprint = [
    { pos: 'Setter', count: 2 },
    { pos: 'Outside Hitter', count: 4 },
    { pos: 'Opposite', count: 2 },
    { pos: 'Middle Blocker', count: 4 },
    { pos: 'Libero', count: 2 }
  ];

  if (totalMBL < 6) {
    // Fallback to 6v6 if we don't have enough Middle Blockers / Liberos for 7v7
    targetSize = 6;
    totalPlayersNeeded = 12;
    blueprint = [
      { pos: 'Setter', count: 2 },
      { pos: 'Outside Hitter', count: 4 },
      { pos: 'Opposite', count: 2 },
      { pos: 'Middle Blocker', count: 2 },
      { pos: 'Libero', count: 2 }
    ];
  }

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
    
    const aPriority = aIsWinner ? 2 : (aIsLoser ? 1 : 0);
    const bPriority = bIsWinner ? 2 : (bIsLoser ? 1 : 0);
    
    if (aPriority !== bPriority) {
      return bPriority - aPriority;
    }
    
    return 0;
  };

  let selectedPlayers: Player[] = [];
  let remainingPlayers = [...allAvailablePlayers]
    .sort(() => Math.random() - 0.5)
    .sort(sortByDeserving);

  // Greedy Assignment based on blueprint
  for (const requirement of blueprint) {
    const candidates = remainingPlayers.filter(p => hasPos(p, requirement.pos));
    const picked = candidates.slice(0, requirement.count);
    
    selectedPlayers.push(...picked);
    remainingPlayers = remainingPlayers.filter(p => !picked.includes(p));
  }

  // Fallback: Fill to targetSize * 2
  if (selectedPlayers.length < totalPlayersNeeded) {
    const needed = totalPlayersNeeded - selectedPlayers.length;
    const fallbacks = remainingPlayers.slice(0, needed);
    selectedPlayers.push(...fallbacks);
  }

  const teamA: Player[] = [];
  const teamB: Player[] = [];
  const teamAPositions: Record<string, string> = {};
  const teamBPositions: Record<string, string> = {};
  
  selectedPlayers.sort((a, b) => b.mmr - a.mmr);
  const getTeamMmr = (t: Player[]) => t.reduce((s, p) => s + p.mmr, 0);

  const assignRole = (p: Player, teamObj: Record<string, string>) => {
    const teamVals = Object.values(teamObj);
    if (hasPos(p, 'Setter') && !teamVals.includes('Setter')) return 'Setter';
    if (hasPos(p, 'Opposite') && !teamVals.includes('Opposite')) return 'Opposite';
    
    if (targetSize === 7) {
      if (hasPos(p, 'Libero') && !teamVals.includes('Libero')) return 'Libero';
      if (hasPos(p, 'Middle Blocker') && teamVals.filter(x => x === 'Middle Blocker').length < 2) return 'Middle Blocker';
    } else {
      // In 6v6, we want exactly 1 MB and 1 Libero per team.
      if (hasPos(p, 'Libero') && !teamVals.includes('Libero')) return 'Libero';
      if (hasPos(p, 'Middle Blocker') && !teamVals.includes('Middle Blocker')) return 'Middle Blocker';
      
      // If they are an MB but the MB slot is taken, they play Libero (and vice-versa)
      if (hasPos(p, 'Middle Blocker') && !teamVals.includes('Libero')) return 'Libero';
      if (hasPos(p, 'Libero') && !teamVals.includes('Middle Blocker')) return 'Middle Blocker';
    }

    if (hasPos(p, 'Outside Hitter') && teamVals.filter(x => x === 'Outside Hitter').length < 2) return 'Outside Hitter';
    
    return getPos(p)[0] || 'Any'; // fallback
  };

  const setters = selectedPlayers.filter(p => hasPos(p, 'Setter'));
  const others = selectedPlayers.filter(p => !hasPos(p, 'Setter'));

  for (const s of setters) {
    if (teamA.length < targetSize && (teamA.length < teamB.length || (teamA.length === teamB.length && getTeamMmr(teamA) <= getTeamMmr(teamB)))) {
      teamA.push(s);
      teamAPositions[s.id] = assignRole(s, teamAPositions);
    } else if (teamB.length < targetSize) {
      teamB.push(s);
      teamBPositions[s.id] = assignRole(s, teamBPositions);
    } else {
      teamA.push(s);
      teamAPositions[s.id] = assignRole(s, teamAPositions);
    }
  }

  for (const p of others) {
    if (teamA.length < targetSize && (teamA.length < teamB.length || (teamA.length === teamB.length && getTeamMmr(teamA) <= getTeamMmr(teamB)))) {
      teamA.push(p);
      teamAPositions[p.id] = assignRole(p, teamAPositions);
    } else if (teamB.length < targetSize) {
      teamB.push(p);
      teamBPositions[p.id] = assignRole(p, teamBPositions);
    } else {
      teamA.push(p);
      teamAPositions[p.id] = assignRole(p, teamAPositions);
    }
  }

  return {
    teamA: teamA.map(p => p.id),
    teamB: teamB.map(p => p.id),
    teamAPositions,
    teamBPositions
  };
}
