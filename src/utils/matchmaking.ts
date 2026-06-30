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
  const getPos = (p: Player) => (p.active_positions && p.active_positions.length > 0) ? p.active_positions : p.positions;
  const hasPos = (p: Player, pos: string | string[]) => {
    const pPos = getPos(p);
    if (Array.isArray(pos)) return pos.some(x => pPos.includes(x));
    return pPos.includes(pos);
  };

  const availableMBs = allAvailablePlayers.filter(p => hasPos(p, 'Middle Blocker'));
  const availableLiberos = allAvailablePlayers.filter(p => hasPos(p, 'Libero') && !hasPos(p, 'Middle Blocker'));
  const totalMBL = availableMBs.length + availableLiberos.length;

  let targetSize = 7;
  let blueprint = [
    { pos: 'Setter', count: 2 },
    { pos: 'Outside Hitter', count: 4 },
    { pos: 'Opposite Hitter', count: 2 },
    { pos: 'Middle Blocker', count: 4 },
    { pos: 'Libero', count: 2 }
  ];

  if (totalMBL < 6) {
    targetSize = 6;
    blueprint = [
      { pos: 'Setter', count: 2 },
      { pos: 'Middle Blocker', count: 2 },
      { pos: 'Outside Hitter', count: 4 },
      { pos: 'Opposite Hitter', count: 2 },
      { pos: 'Libero', count: 2 }
    ];
  }

  const isFirstMatch = lastMatchWinningTeamIds.length === 0 && lastMatchLosingTeamIds.length === 0;

  const sortByDeserving = (a: Player, b: Player) => {
    if (a.games_played_today !== b.games_played_today) {
      return a.games_played_today - b.games_played_today;
    }
    if (isFirstMatch) {
      // Use ID for a stable pseudo-random sort in Game 1 to prevent UI flickering in the spectator queue
      return a.id.localeCompare(b.id);
    }
    return b.mmr - a.mmr;
  };

  const lastMatchAllIds = new Set([...lastMatchWinningTeamIds, ...lastMatchLosingTeamIds]);

  const benchPlayers = allAvailablePlayers.filter(p => !lastMatchAllIds.has(p.id)).sort(sortByDeserving);
  const winnerPlayers = allAvailablePlayers.filter(p => lastMatchWinningTeamIds.includes(p.id)).sort(sortByDeserving);
  const loserPlayers = allAvailablePlayers.filter(p => lastMatchLosingTeamIds.includes(p.id)).sort(sortByDeserving);

  let remainingPlayers = [...benchPlayers, ...winnerPlayers, ...loserPlayers];

  const teamA: Player[] = [];
  const teamB: Player[] = [];
  const teamAPositions: Record<string, string> = {};
  const teamBPositions: Record<string, string> = {};

  const getTeamMmr = (t: Player[]) => t.reduce((s, p) => s + p.mmr, 0);

  // Draft players into exact roles
  for (const requirement of blueprint) {
    // For 6v6 fallback, MB and Libero can swap if needed
    let candidates = remainingPlayers.filter(p => hasPos(p, requirement.pos));
    
    if (targetSize === 6 && candidates.length < requirement.count) {
      if (requirement.pos === 'Middle Blocker') {
        const extra = remainingPlayers.filter(p => !candidates.includes(p) && hasPos(p, 'Libero'));
        candidates.push(...extra);
      } else if (requirement.pos === 'Libero') {
        const extra = remainingPlayers.filter(p => !candidates.includes(p) && hasPos(p, 'Middle Blocker'));
        candidates.push(...extra);
      }
    }

    const picked = candidates.slice(0, requirement.count);
    
    // IF WE ARE SHORT ON THIS POSITION, FORCE A FALLBACK PLAYER TO PLAY THIS ROLE
    if (picked.length < requirement.count) {
      const needed = requirement.count - picked.length;
      const fallbacks = remainingPlayers.filter(p => !picked.includes(p)).slice(0, needed);
      picked.push(...fallbacks);
    }
    
    // Distribute picked players evenly between A and B
    picked.sort((a, b) => b.mmr - a.mmr); // strongest first

    const maxPerTeam = requirement.count / 2;
    for (const p of picked) {
      const countA = teamA.filter(x => teamAPositions[x.id] === requirement.pos).length;
      const countB = teamB.filter(x => teamBPositions[x.id] === requirement.pos).length;
      const mmrA = getTeamMmr(teamA);
      const mmrB = getTeamMmr(teamB);

      if (countA < maxPerTeam && (countB >= maxPerTeam || mmrA <= mmrB)) {
        teamA.push(p);
        teamAPositions[p.id] = requirement.pos;
      } else if (countB < maxPerTeam) {
        teamB.push(p);
        teamBPositions[p.id] = requirement.pos;
      } else {
        teamA.push(p);
        teamAPositions[p.id] = requirement.pos;
      }
    }

    remainingPlayers = remainingPlayers.filter(p => !picked.includes(p));
  }

  // Fallback for missing players (if total picked < 12 or 14)
  const totalNeeded = targetSize * 2;
  const currentTotal = teamA.length + teamB.length;
  if (currentTotal < totalNeeded) {
    const fallbacks = remainingPlayers.slice(0, totalNeeded - currentTotal);
    fallbacks.sort((a, b) => b.mmr - a.mmr);

    for (const p of fallbacks) {
      if (teamA.length < targetSize && (teamB.length >= targetSize || getTeamMmr(teamA) <= getTeamMmr(teamB))) {
        teamA.push(p);
        teamAPositions[p.id] = getPos(p)[0] || 'Any';
      } else {
        teamB.push(p);
        teamBPositions[p.id] = getPos(p)[0] || 'Any';
      }
    }
  }

  return {
    teamA: teamA.map(p => p.id),
    teamB: teamB.map(p => p.id),
    teamAPositions,
    teamBPositions
  };
}

export type PlayerDraftStatus = 'in_next_match' | 'position_conflict' | 'sitting_out';

export type PlayerWithStatus = Player & {
  draftStatus: PlayerDraftStatus;
  draftedPosition?: string;
  positionSlotFill?: Array<{
    position: string;
    filled: number;
    total: number;
  }>;
};

export function previewNextDraft(
  allAvailablePlayers: Player[],
  lastMatchWinningTeamIds: string[],
  lastMatchLosingTeamIds: string[],
  isStrictMode: boolean
): PlayerWithStatus[] {
  if (!isStrictMode) {
    const drafted = draftTeams(allAvailablePlayers);
    const draftedIds = new Set([...drafted.teamA, ...drafted.teamB]);
    return allAvailablePlayers.map(p => ({
      ...p,
      draftStatus: draftedIds.has(p.id) ? 'in_next_match' : 'sitting_out'
    }));
  }

  const drafted = draftStrictTeams(allAvailablePlayers, lastMatchWinningTeamIds, lastMatchLosingTeamIds);
  const draftedIds = new Set([...drafted.teamA, ...drafted.teamB]);
  
  const getPos = (p: Player) => (p.active_positions && p.active_positions.length > 0) ? p.active_positions : p.positions;
  const hasPos = (p: Player, pos: string | string[]) => {
    const pPos = getPos(p);
    if (Array.isArray(pos)) return pos.some(x => pPos.includes(x));
    return pPos.includes(pos);
  };
  
  const availableMBs = allAvailablePlayers.filter(p => hasPos(p, 'Middle Blocker'));
  const availableLiberos = allAvailablePlayers.filter(p => hasPos(p, 'Libero') && !hasPos(p, 'Middle Blocker'));
  const totalMBL = availableMBs.length + availableLiberos.length;

  let blueprint = [
    { pos: 'Setter', count: 2 },
    { pos: 'Outside Hitter', count: 4 },
    { pos: 'Opposite Hitter', count: 2 },
    { pos: 'Middle Blocker', count: 4 },
    { pos: 'Libero', count: 2 }
  ];

  if (totalMBL < 6) {
    blueprint = [
      { pos: 'Setter', count: 2 },
      { pos: 'Middle Blocker', count: 2 },
      { pos: 'Outside Hitter', count: 4 },
      { pos: 'Opposite Hitter', count: 2 },
      { pos: 'Libero', count: 2 }
    ];
  }

  const positionFills: Record<string, number> = {};
  for (const b of blueprint) positionFills[b.pos] = 0;
  
  Object.values(drafted.teamAPositions).forEach(pos => { if (positionFills[pos] !== undefined) positionFills[pos]++ });
  Object.values(drafted.teamBPositions).forEach(pos => { if (positionFills[pos] !== undefined) positionFills[pos]++ });

  const lastMatchAllIds = new Set([...lastMatchWinningTeamIds, ...lastMatchLosingTeamIds]);

  return allAvailablePlayers.map(p => {
    const pPos = getPos(p);
    const positionSlotFill = pPos.map(pos => {
      const b = blueprint.find(x => x.pos === pos);
      return {
        position: pos,
        filled: b ? positionFills[pos] : 0,
        total: b ? b.count : 0
      };
    }).filter(x => x.total > 0);

    if (draftedIds.has(p.id)) {
      const draftedPosition = drafted.teamAPositions[p.id] || drafted.teamBPositions[p.id] || 'Any';
      
      if (draftedPosition !== 'Any' && !positionSlotFill.some(x => x.position === draftedPosition)) {
        const b = blueprint.find(x => x.pos === draftedPosition);
        if (b) {
          positionSlotFill.push({
            position: draftedPosition,
            filled: positionFills[draftedPosition] || 0,
            total: b.count
          });
        }
      }

      return { 
        ...p, 
        draftStatus: 'in_next_match',
        draftedPosition,
        positionSlotFill
      };
    }
    
    // Bench players who didn't make the cut are flagged as 'position_conflict'
    const isBench = !lastMatchAllIds.has(p.id);
    const draftStatus = isBench ? 'position_conflict' : 'sitting_out';
    
    return {
      ...p,
      draftStatus,
      positionSlotFill
    };
  });
}
