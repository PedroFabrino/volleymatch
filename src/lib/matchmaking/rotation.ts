import type { Player, PlayerWithStatus } from './types';
import type { PlayerPosition } from '@/types/player';
import { draftTeams } from './draft';
import { draftStrictTeams } from './strict-draft';

const POSITION_BLUEPRINT: Array<{ pos: PlayerPosition; count: number }> = [
  { pos: 'Setter', count: 2 },
  { pos: 'Outside Hitter', count: 4 },
  { pos: 'Opposite Hitter', count: 2 },
  { pos: 'Middle Blocker', count: 4 },
  { pos: 'Libero', count: 2 },
]

const POSITION_BLUEPRINT_FALLBACK: Array<{ pos: PlayerPosition; count: number }> = [
  { pos: 'Setter', count: 2 },
  { pos: 'Middle Blocker', count: 2 },
  { pos: 'Outside Hitter', count: 4 },
  { pos: 'Opposite Hitter', count: 2 },
  { pos: 'Libero', count: 2 },
]

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
  const hasPos = (p: Player, pos: PlayerPosition | PlayerPosition[]) => {
    const pPos = getPos(p);
    if (Array.isArray(pos)) return pos.some(x => pPos.includes(x));
    return pPos.includes(pos);
  };
  
  const availableMBs = allAvailablePlayers.filter(p => hasPos(p, 'Middle Blocker'));
  const availableLiberos = allAvailablePlayers.filter(p => hasPos(p, 'Libero') && !hasPos(p, 'Middle Blocker'));
  const totalMBL = availableMBs.length + availableLiberos.length;

  let blueprint = [...POSITION_BLUEPRINT];

  if (totalMBL < 6) {
    blueprint = [...POSITION_BLUEPRINT_FALLBACK];
  }

  const positionFills: Partial<Record<PlayerPosition, number>> = {};
  for (const b of blueprint) positionFills[b.pos] = 0;
  
  Object.values(drafted.teamAPositions).forEach(pos => { if (positionFills[pos] !== undefined) positionFills[pos]!++ });
  Object.values(drafted.teamBPositions).forEach(pos => { if (positionFills[pos] !== undefined) positionFills[pos]!++ });

  const lastMatchAllIds = new Set([...lastMatchWinningTeamIds, ...lastMatchLosingTeamIds]);
  const benchPlayers = allAvailablePlayers.filter(p => !lastMatchAllIds.has(p.id));

  const benchPositionFills: Partial<Record<PlayerPosition, number>> = {};
  for (const b of blueprint) benchPositionFills[b.pos] = 0;

  benchPlayers.forEach(p => {
    const pPos = getPos(p);
    pPos.forEach(pos => {
      if (benchPositionFills[pos] !== undefined) benchPositionFills[pos]!++;
    });
  });

  return allAvailablePlayers.map(p => {
    const pPos = getPos(p);
    const isDrafted = draftedIds.has(p.id);
    
    // If drafted, show the fill of the NEXT match (usually full). 
    // If bench, show the fill of the bench capacity (the next-next match).
    const positionSlotFill = pPos.map(pos => {
      const b = blueprint.find(x => x.pos === pos);
      const filledCount = isDrafted ? positionFills[pos] : benchPositionFills[pos];
      return {
        position: pos,
        filled: b ? Math.min(filledCount || 0, b.count) : 0,
        total: b ? b.count : 0
      };
    }).filter(x => x.total > 0);

    if (isDrafted) {
      const draftedPosition: PlayerPosition = drafted.teamAPositions[p.id] || drafted.teamBPositions[p.id] || 'Any';
      
      if (draftedPosition !== 'Any' && !positionSlotFill.some(x => x.position === draftedPosition)) {
        const b = blueprint.find(x => x.pos === draftedPosition);
        if (b) {
          positionSlotFill.push({
            position: draftedPosition,
            filled: Math.min(positionFills[draftedPosition] || 0, b.count),
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
