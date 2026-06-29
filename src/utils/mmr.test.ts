import { describe, it, expect } from 'vitest';
import { calculateMmrChanges, MatchData, PlayerData } from './mmr';

describe('MMR Algorithm', () => {

  it('should calculate symmetric MMR changes for a 50/50 match', () => {
    const match: MatchData = {
      team_a_players: ['p1', 'p2'],
      team_b_players: ['p3', 'p4'],
      team_a_score: 15,
      team_b_score: 10,
      point_timeline: Array(25).fill({ team: 'a', increment: 1, scoreA: 0, scoreB: 0, timestamp: '' })
    };

    const players: Record<string, PlayerData> = {
      'p1': { id: 'p1', mmr: 1200 },
      'p2': { id: 'p2', mmr: 1200 },
      'p3': { id: 'p3', mmr: 1200 },
      'p4': { id: 'p4', mmr: 1200 },
    };

    const results = calculateMmrChanges(match, players);
    
    const p1Result = results.find(r => r.playerId === 'p1');
    const p3Result = results.find(r => r.playerId === 'p3');

    // Expected A = 0.5. Actual A = 1.
    // Base Shift = 32 * log(5+1) * 0.5 = 16 * 1.79 = 28.6
    expect(p1Result?.mmrChange).toBeGreaterThan(15);
    expect(p3Result?.mmrChange).toBeLessThan(-15);
    
    // Symmetric because they all played 100% of the game
    expect(p1Result?.mmrChange).toBe(Math.abs(p3Result!.mmrChange));
  });

  it('should scale MMR based on points played (substitutions)', () => {
    // A 10 point match. p1 plays all 10 points. p2 plays 5 points.
    const match: MatchData = {
      team_a_players: ['p1', 'p2'], // starting
      team_b_players: ['p3'],
      team_a_score: 10,
      team_b_score: 0,
      point_timeline: [
        { team: 'a', increment: 1, scoreA: 1, scoreB: 0, timestamp: '' },
        { team: 'a', increment: 1, scoreA: 2, scoreB: 0, timestamp: '' },
        { team: 'a', increment: 1, scoreA: 3, scoreB: 0, timestamp: '' },
        { team: 'a', increment: 1, scoreA: 4, scoreB: 0, timestamp: '' },
        { team: 'a', increment: 1, scoreA: 5, scoreB: 0, timestamp: '' },
        { type: 'substitution', team: 'a', playerOutId: 'p2', playerInId: 'p5', timestamp: '', scoreA: 5, scoreB: 0 },
        { team: 'a', increment: 1, scoreA: 6, scoreB: 0, timestamp: '' },
        { team: 'a', increment: 1, scoreA: 7, scoreB: 0, timestamp: '' },
        { team: 'a', increment: 1, scoreA: 8, scoreB: 0, timestamp: '' },
        { team: 'a', increment: 1, scoreA: 9, scoreB: 0, timestamp: '' },
        { team: 'a', increment: 1, scoreA: 10, scoreB: 0, timestamp: '' },
      ]
    };

    const players: Record<string, PlayerData> = {
      'p1': { id: 'p1', mmr: 1200 },
      'p2': { id: 'p2', mmr: 1200 },
      'p3': { id: 'p3', mmr: 1200 },
      'p5': { id: 'p5', mmr: 1200 },
    };

    const results = calculateMmrChanges(match, players);
    
    const p1Change = results.find(r => r.playerId === 'p1')!.mmrChange;
    const p2Change = results.find(r => r.playerId === 'p2')!.mmrChange;
    const p5Change = results.find(r => r.playerId === 'p5')!.mmrChange;

    // p1 played 10 points. p2 played 5 points. p5 played 5 points.
    // p2 and p5 should get exactly half the MMR of p1
    expect(p2Change).toBe(Math.round(p1Change / 2));
    expect(p5Change).toBe(Math.round(p1Change / 2));
  });

});
