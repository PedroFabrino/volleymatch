import type { Player } from './types';
import type { PlayerPosition } from '@/types/player';
import { shuffleArray } from './shuffle';

/** Order a queue bucket: fewest games first, random among ties. */
export function orderQueueGroup(players: Player[]): Player[] {
  if (players.length === 0) return [];

  const grouped = new Map<number, Player[]>();
  for (const p of players) {
    const games = p.games_played_today;
    if (!grouped.has(games)) grouped.set(games, []);
    grouped.get(games)!.push(p);
  }

  return [...grouped.keys()]
    .sort((a, b) => a - b)
    .flatMap(games => shuffleArray(grouped.get(games)!));
}

/** Bench → winners → losers, each bucket ordered by queue priority. */
export function orderPlayersForQueuePreview(
  allPlayers: Player[],
  lastMatchWinningTeamIds: string[],
  lastMatchLosingTeamIds: string[],
): Player[] {
  const lastMatchAllIds = new Set([...lastMatchWinningTeamIds, ...lastMatchLosingTeamIds]);
  const bench = orderQueueGroup(allPlayers.filter(p => !lastMatchAllIds.has(p.id)));
  const winners = orderQueueGroup(allPlayers.filter(p => lastMatchWinningTeamIds.includes(p.id)));
  const losers = orderQueueGroup(allPlayers.filter(p => lastMatchLosingTeamIds.includes(p.id)));
  return [...bench, ...winners, ...losers];
}

/** @deprecated Use orderQueueGroup — kept for tests that compare pairwise queue priority. */
export function sortPlayersByDraftPriority(a: Player, b: Player, _isFirstMatch: boolean) {
  if (a.games_played_today !== b.games_played_today) {
    return a.games_played_today - b.games_played_today;
  }
  return 0;
}

export function draftStrictTeams(allAvailablePlayers: Player[], lastMatchWinningTeamIds: string[], lastMatchLosingTeamIds: string[]): { teamA: string[], teamB: string[], teamAPositions: Record<string, PlayerPosition>, teamBPositions: Record<string, PlayerPosition> } {
  const getPos = (p: Player) => (p.active_positions && p.active_positions.length > 0) ? p.active_positions : p.positions;
  const hasPos = (p: Player, pos: PlayerPosition | PlayerPosition[]) => {
    const pPos = getPos(p);
    if (Array.isArray(pos)) return pos.some(x => pPos.includes(x));
    return pPos.includes(pos);
  };

  const availableMBs = allAvailablePlayers.filter(p => hasPos(p, 'Middle Blocker'));
  const availableLiberos = allAvailablePlayers.filter(p => hasPos(p, 'Libero') && !hasPos(p, 'Middle Blocker'));
  const totalMBL = availableMBs.length + availableLiberos.length;
  // Pure liberos must never be drafted as Middle Blockers
  const pureLiberos = new Set(availableLiberos.map(p => p.id));

  let targetSize = 7;
  let blueprint: Array<{ pos: PlayerPosition; count: number }> = [
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

  const lastMatchAllIds = new Set([...lastMatchWinningTeamIds, ...lastMatchLosingTeamIds]);

  const benchPlayers = orderQueueGroup(allAvailablePlayers.filter(p => !lastMatchAllIds.has(p.id)));
  const winnerPlayers = orderQueueGroup(allAvailablePlayers.filter(p => lastMatchWinningTeamIds.includes(p.id)));
  const loserPlayers = orderQueueGroup(allAvailablePlayers.filter(p => lastMatchLosingTeamIds.includes(p.id)));

  let remainingPlayers = [...benchPlayers, ...winnerPlayers, ...loserPlayers];

  const teamA: Player[] = [];
  const teamB: Player[] = [];
  const teamAPositions: Record<string, PlayerPosition> = {};
  const teamBPositions: Record<string, PlayerPosition> = {};

  const getTeamMmr = (t: Player[]) => t.reduce((s, p) => s + p.mmr, 0);

  // Draft players into exact roles
  for (const requirement of blueprint) {
    // For 6v6 fallback, MB and Libero can swap if needed
    let candidates = remainingPlayers.filter(p => hasPos(p, requirement.pos));
    
    if (targetSize === 6 && candidates.length < requirement.count) {
      if (requirement.pos === 'Middle Blocker') {
        // Only allow players who have BOTH MB and Libero — never pure Liberos
        const extra = remainingPlayers.filter(p => !candidates.includes(p) && hasPos(p, 'Libero') && hasPos(p, 'Middle Blocker'));
        candidates.push(...extra);
      } else if (requirement.pos === 'Libero') {
        const extra = remainingPlayers.filter(p => !candidates.includes(p) && hasPos(p, 'Middle Blocker'));
        candidates.push(...extra);
      }
    }

    const picked = candidates.slice(0, requirement.count);
    
    // Never assign a pure Libero to Middle Blocker slot
    if (requirement.pos === 'Middle Blocker') {
      const safePicked = picked.filter(p => !pureLiberos.has(p.id));
      const needed = requirement.count - safePicked.length;
      if (needed > 0) {
        const fallbacks = remainingPlayers.filter(p => !safePicked.includes(p) && !pureLiberos.has(p.id)).slice(0, needed);
        safePicked.push(...fallbacks);
      }
      picked.length = 0;
      picked.push(...safePicked);
    }

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
