import { describe, it, expect } from 'vitest';
import { draftTeams, draftStrictTeams, Player } from './src/utils/matchmaking.ts';

const createPlayer = (id, mmr, positions, active_positions = null) => ({
  id,
  name: `Player ${id}`,
  mmr,
  positions,
  active_positions,
  games_played_today: 0
});

const players = [
  { ...createPlayer('OH_Queue', 1500, ['Outside Hitter']), games_played_today: 0 },
  { ...createPlayer('OH_Winner', 1500, ['Outside Hitter']), games_played_today: 1 },
  { ...createPlayer('OH_Loser', 1500, ['Outside Hitter']), games_played_today: 1 },
];
for (let i = 0; i < 11; i++) players.push(createPlayer(`D${i}`, 1500, ['Setter'])); 
players.push({ ...createPlayer('OH_Queue_2', 1500, ['Outside Hitter']), games_played_today: 0 });
players.push({ ...createPlayer('OH_Winner_2', 1500, ['Outside Hitter']), games_played_today: 1 });

const { teamA, teamB } = draftStrictTeams(players, ['OH_Winner', 'OH_Winner_2'], ['OH_Loser']);

const drafted = [...teamA, ...teamB];

console.log("Drafted:", drafted);
console.log("Includes OH_Loser?", drafted.includes('OH_Loser'));
