import { describe, it, expect } from 'vitest';
import { draftTeams, Player } from './matchmaking';

describe('Matchmaking Algorithm', () => {

  const createPlayer = (id: string, mmr: number, positions: string[], active_positions: string[] | null = null): Player => ({
    id,
    name: `Player ${id}`,
    mmr,
    positions,
    active_positions,
    games_played_today: 0
  });

  it('should distribute 2 setters into opposite teams', () => {
    const players: Player[] = [
      createPlayer('S1', 1500, ['Setter']),
      createPlayer('S2', 1400, ['Setter']),
      createPlayer('H1', 1600, ['Outside Hitter']),
      createPlayer('H2', 1500, ['Outside Hitter']),
      createPlayer('H3', 1400, ['Outside Hitter']),
      createPlayer('H4', 1300, ['Outside Hitter']),
    ];

    const { teamA, teamB } = draftTeams(players);
    
    expect(teamA.includes('S1') || teamB.includes('S1')).toBe(true);
    expect(teamA.includes('S1')).not.toBe(teamB.includes('S1'));
    
    // They should be in opposite teams
    const teamAHasSetter = teamA.includes('S1') || teamA.includes('S2');
    const teamBHasSetter = teamB.includes('S1') || teamB.includes('S2');
    expect(teamAHasSetter).toBe(true);
    expect(teamBHasSetter).toBe(true);
  });

  it('should respect active_positions when filtering setters', () => {
    const players: Player[] = [
      createPlayer('S1', 1500, ['Setter']),
      // S2 has Setter but it is toggled OFF (active_positions = ['Outside Hitter'])
      createPlayer('S2', 1400, ['Setter', 'Outside Hitter'], ['Outside Hitter']), 
      createPlayer('S3', 1300, ['Setter']),
      createPlayer('H1', 1600, ['Outside Hitter']),
      createPlayer('H2', 1500, ['Outside Hitter']),
      createPlayer('H3', 1400, ['Outside Hitter']),
    ];

    const { teamA, teamB } = draftTeams(players);

    // S1 and S3 are the only active setters, they should be split
    const teamAHasRealSetter = teamA.includes('S1') || teamA.includes('S3');
    const teamBHasRealSetter = teamB.includes('S1') || teamB.includes('S3');
    expect(teamAHasRealSetter).toBe(true);
    expect(teamBHasRealSetter).toBe(true);
  });

  it('should compensate the team missing a setter when there is only 1 setter', () => {
    const players: Player[] = [
      createPlayer('S1', 1500, ['Setter']),
      createPlayer('H1', 1700, ['Outside Hitter']),
      createPlayer('H2', 1600, ['Outside Hitter']),
      createPlayer('H3', 1500, ['Outside Hitter']),
      createPlayer('H4', 1400, ['Outside Hitter']),
      createPlayer('H5', 1300, ['Outside Hitter']),
    ];

    const { teamA, teamB } = draftTeams(players);

    const teamAHasSetter = teamA.includes('S1');
    const mmrA = teamA.reduce((sum, id) => sum + players.find(p => p.id === id)!.mmr, 0);
    const mmrB = teamB.reduce((sum, id) => sum + players.find(p => p.id === id)!.mmr, 0);

    // The team WITHOUT the setter should be given higher raw MMR to compensate
    if (teamAHasSetter) {
      expect(mmrB).toBeGreaterThanOrEqual(mmrA);
    } else {
      expect(mmrA).toBeGreaterThanOrEqual(mmrB);
    }
  });

});
