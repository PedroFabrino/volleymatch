import { describe, it, expect } from 'vitest';
import { draftTeams, draftStrictTeams, Player } from './matchmaking';

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

  describe('Strict Positional Mode', () => {
    it('should draft exactly 14 players according to blueprint', () => {
      const players: Player[] = [];
      for (let i = 0; i < 4; i++) players.push(createPlayer(`S${i}`, 1500, ['Setter']));
      for (let i = 0; i < 6; i++) players.push(createPlayer(`OH${i}`, 1500, ['Outside Hitter']));
      for (let i = 0; i < 3; i++) players.push(createPlayer(`OP${i}`, 1500, ['Opposite']));
      for (let i = 0; i < 5; i++) players.push(createPlayer(`MB${i}`, 1500, ['Middle Blocker']));
      for (let i = 0; i < 3; i++) players.push(createPlayer(`L${i}`, 1500, ['Libero']));

      const { teamA, teamB } = draftStrictTeams(players, [], []);
      
      expect(teamA.length).toBe(7);
      expect(teamB.length).toBe(7);

      // Verify each team has exactly 1 setter
      const settersInA = teamA.filter(id => id.startsWith('S'));
      const settersInB = teamB.filter(id => id.startsWith('S'));
      
      expect(settersInA.length).toBe(1);
      expect(settersInB.length).toBe(1);
    });

    it('should prioritize queue over losers and winners over losers', () => {
      const players: Player[] = [
        { ...createPlayer('OH_Queue', 1500, ['Outside Hitter']), games_played_today: 0 },
        { ...createPlayer('OH_Winner', 1500, ['Outside Hitter']), games_played_today: 1 },
        { ...createPlayer('OH_Loser', 1500, ['Outside Hitter']), games_played_today: 1 },
      ];
      // We fill the rest with dummies so the algorithm has enough to draft
      for (let i = 0; i < 11; i++) players.push(createPlayer(`D${i}`, 1500, ['Setter'])); 

      // If we only need 1 Outside Hitter total (pretend the blueprint only asks for 4, and we have 3 + 11 dummies)
      // Actually, wait, blueprint asks for 4 Outside Hitters. We only gave it 3. It will take ALL 3.
      // Let's give it 5 Outside Hitters so it has to leave 1 out.
      players.push({ ...createPlayer('OH_Queue_2', 1500, ['Outside Hitter']), games_played_today: 0 });
      players.push({ ...createPlayer('OH_Winner_2', 1500, ['Outside Hitter']), games_played_today: 1 });

      const { teamA, teamB } = draftStrictTeams(players, ['OH_Winner', 'OH_Winner_2'], ['OH_Loser']);
      
      const drafted = [...teamA, ...teamB];

      // The blueprint asks for 4 Outside Hitters.
      // We have 5: OH_Queue, OH_Queue_2, OH_Winner, OH_Winner_2, OH_Loser
      // Priorities: Queue (games=0) -> Winner (games=1) -> Loser (games=1)
      // It should draft: OH_Queue, OH_Queue_2, OH_Winner, OH_Winner_2.
      // It should NOT draft OH_Loser.
      
      expect(drafted).toContain('OH_Queue');
      expect(drafted).toContain('OH_Queue_2');
      expect(drafted).toContain('OH_Winner');
      expect(drafted).toContain('OH_Winner_2');
      expect(drafted).not.toContain('OH_Loser');
    });
  });

});
