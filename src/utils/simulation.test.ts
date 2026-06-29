import { describe, it, expect } from 'vitest';
import { calculateMmrChanges, MatchData, PlayerData, PointEvent } from './mmr';
import { draftTeams, draftStrictTeams, Player } from './matchmaking';

// Helper to generate a random number between min and max
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// Generate 20 players with random MMRs and positions
const generateRoster = (): Player[] => {
  const positions = ['Setter', 'Outside Hitter', 'Opposite', 'Middle Blocker', 'Libero'];
  const roster: Player[] = [];
  
  for (let i = 1; i <= 20; i++) {
    // Give each player 1 to 2 random positions
    const posCount = randomInt(1, 2);
    const pPositions: string[] = [];
    while (pPositions.length < posCount) {
      const pos = positions[randomInt(0, positions.length - 1)];
      if (!pPositions.includes(pos)) pPositions.push(pos);
    }

    roster.push({
      id: `player_${i}`,
      name: `Player ${i}`,
      mmr: randomInt(1000, 1400),
      positions: pPositions,
      active_positions: null,
      games_played_today: 0,
    });
  }
  return roster;
};

// Simulate a match by generating a random point timeline
const simulateMatchTimeline = (teamA: string[], teamB: string[], teamAPos: Record<string, string>, teamBPos: Record<string, string>, roster: Player[], doSubstitutions: boolean = false): MatchData => {
  let scoreA = 0;
  let scoreB = 0;
  const timeline: PointEvent[] = [];

  const teamACourt = [...teamA];
  const teamBCourt = [...teamB];
  
  // Find bench players for substitutions
  const allPlayersInMatch = new Set([...teamA, ...teamB]);
  const bench = roster.filter(p => !allPlayersInMatch.has(p.id)).map(p => p.id);

  while (scoreA < 25 && scoreB < 25) {
    // Random point winner, slightly biased by current team MMRs to make it somewhat realistic
    // For simplicity, just 50/50 here
    if (Math.random() > 0.5) {
      scoreA++;
      timeline.push({ team: 'a', increment: 1, scoreA, scoreB, timestamp: new Date().toISOString() });
    } else {
      scoreB++;
      timeline.push({ team: 'b', increment: 1, scoreA, scoreB, timestamp: new Date().toISOString() });
    }

    // 10% chance of a substitution if there's someone on the bench
    if (doSubstitutions && bench.length > 0 && Math.random() < 0.1) {
      const isTeamA = Math.random() > 0.5;
      const subIn = bench.pop()!;
      if (isTeamA) {
        const outIdx = randomInt(0, teamACourt.length - 1);
        const subOut = teamACourt[outIdx];
        teamACourt[outIdx] = subIn;
        const pos = teamAPos[subOut] || 'Any';
        teamAPos[subIn] = pos;
        
        timeline.push({ type: 'substitution', team: 'a', playerOutId: subOut, playerInId: subIn, filledPosition: pos, scoreA, scoreB, timestamp: new Date().toISOString() });
      } else {
        const outIdx = randomInt(0, teamBCourt.length - 1);
        const subOut = teamBCourt[outIdx];
        teamBCourt[outIdx] = subIn;
        const pos = teamBPos[subOut] || 'Any';
        teamBPos[subIn] = pos;
        
        timeline.push({ type: 'substitution', team: 'b', playerOutId: subOut, playerInId: subIn, filledPosition: pos, scoreA, scoreB, timestamp: new Date().toISOString() });
      }
    }
  }

  // If tied 24-24, keep playing until 2 point diff
  while (Math.abs(scoreA - scoreB) < 2 && scoreA >= 24 && scoreB >= 24) {
    if (Math.random() > 0.5) {
      scoreA++;
      timeline.push({ team: 'a', increment: 1, scoreA, scoreB, timestamp: new Date().toISOString() });
    } else {
      scoreB++;
      timeline.push({ team: 'b', increment: 1, scoreA, scoreB, timestamp: new Date().toISOString() });
    }
  }

  return {
    team_a_players: teamACourt, // Court at end of match
    team_b_players: teamBCourt,
    team_a_score: scoreA,
    team_b_score: scoreB,
    team_a_positions: teamAPos,
    team_b_positions: teamBPos,
    point_timeline: timeline
  };
};

describe('Matchmaking & MMR Simulation', () => {

  it('Simulates 20 Casual (Balancing) games with 20 players', () => {
    const roster = generateRoster();
    const mmrHistory: Record<string, number[]> = {};
    roster.forEach(p => mmrHistory[p.id] = [p.mmr]);

    for (let game = 1; game <= 20; game++) {
      // 1. Sort roster to draft based on games played
      const playersToDraft = [...roster].sort((a, b) => {
        if (a.games_played_today !== b.games_played_today) {
          return a.games_played_today - b.games_played_today;
        }
        return Math.random() - 0.5; // Random tie breaker
      }).slice(0, 12); // Draft 12 players for 6v6

      // 2. Draft Teams
      const { teamA, teamB } = draftTeams(playersToDraft);
      
      // Setup default positions for casual
      const teamAPos = Object.fromEntries(teamA.map(id => [id, 'Any']));
      const teamBPos = Object.fromEntries(teamB.map(id => [id, 'Any']));

      // 3. Play Match (With subs occasionally)
      const matchData = simulateMatchTimeline(teamA, teamB, teamAPos, teamBPos, roster, true);

      // 4. Calculate MMR
      const playerRecords = Object.fromEntries(roster.map(p => [p.id, { id: p.id, mmr: p.mmr, positions: p.positions }]));
      const updates = calculateMmrChanges(matchData, playerRecords);

      // 5. Apply Updates
      updates.forEach(update => {
        const p = roster.find(r => r.id === update.playerId);
        if (p) {
          p.mmr = update.newMmr;
          p.games_played_today += update.queueIncrement;
          mmrHistory[p.id].push(p.mmr);
        }
      });
    }

    // Verify properties after 20 casual games
    const gamesPlayed = roster.map(p => p.games_played_today);
    const maxGames = Math.max(...gamesPlayed);
    const minGames = Math.min(...gamesPlayed);
    
    // Everyone should have played roughly the same amount of games (due to queue priority)
    // Total spots = 20 games * 12 spots = 240 spots. 
    // Sub spots = maybe 10-20. Total participations ~250.
    // Average per player (20 players) = ~12.5 games.
    expect(maxGames - minGames).toBeLessThanOrEqual(5); // At most 5 games difference
    
    // Check MMR didn't explode
    const finalMmrs = roster.map(p => p.mmr);
    const maxMmr = Math.max(...finalMmrs);
    expect(maxMmr).toBeLessThan(1800); // Realistic bound
  });

  it('Simulates 20 Strict (Positional) games with 20 players', () => {
    const roster = generateRoster();
    const mmrHistory: Record<string, number[]> = {};
    roster.forEach(p => mmrHistory[p.id] = [p.mmr]);

    let lastWinningTeam: string[] = [];
    let lastLosingTeam: string[] = [];

    for (let game = 1; game <= 20; game++) {
      // 1. Draft Teams with Strict Matchmaker (7v7)
      const { teamA, teamB, teamAPositions, teamBPositions } = draftStrictTeams(roster, lastWinningTeam, lastLosingTeam);
      
      // Ensure we have exactly 14 players drafted
      expect(teamA.length + teamB.length).toBe(14);

      // 2. Play Match (With subs)
      const matchData = simulateMatchTimeline(teamA, teamB, teamAPositions, teamBPositions, roster, true);

      // 3. Calculate MMR
      const playerRecords = Object.fromEntries(roster.map(p => [p.id, { id: p.id, mmr: p.mmr, positions: p.positions }]));
      const updates = calculateMmrChanges(matchData, playerRecords);

      // 4. Apply Updates
      updates.forEach(update => {
        const p = roster.find(r => r.id === update.playerId);
        if (p) {
          p.mmr = update.newMmr;
          p.games_played_today += update.queueIncrement;
          mmrHistory[p.id].push(p.mmr);
        }
      });

      if (matchData.team_a_score > matchData.team_b_score) {
        lastWinningTeam = matchData.team_a_players;
        lastLosingTeam = matchData.team_b_players;
      } else {
        lastWinningTeam = matchData.team_b_players;
        lastLosingTeam = matchData.team_a_players;
      }
    }

    // Verify properties after 20 strict games
    const gamesPlayed = roster.map(p => p.games_played_today);
    const maxGames = Math.max(...gamesPlayed);
    const minGames = Math.min(...gamesPlayed);
    
    // Strict matchmaker doesn't guarantee perfectly even distribution due to position bottlenecks, 
    // but it should still be somewhat balanced by queue priority fallback.
    // Total spots = 20 games * 14 spots = 280. Avg = 14 per player.
    expect(minGames).toBeGreaterThan(0); // Everyone should play at least once in 20 games with 20 players!

    // Validate MMR boundedness
    const finalMmrs = roster.map(p => p.mmr);
    const maxMmr = Math.max(...finalMmrs);
    const minMmr = Math.min(...finalMmrs);
    
    expect(maxMmr).toBeLessThan(2000);
    expect(minMmr).toBeGreaterThan(500);
  });

  it('Simulates a 20-person session with only 2 Middle Blockers', () => {
    const roster: Player[] = [];
    const positionsWithoutMB = ['Setter', 'Outside Hitter', 'Opposite', 'Libero'];
    
    // Create exactly 2 Middle Blockers
    for (let i = 1; i <= 2; i++) {
      roster.push({
        id: `mb_${i}`,
        name: `MB ${i}`,
        mmr: 1200,
        positions: ['Middle Blocker'],
        active_positions: null,
        games_played_today: 0,
      });
    }

    // Create 18 others (no MBs)
    for (let i = 1; i <= 18; i++) {
      // randomly give them 1 or 2 positions to ensure filling works
      const posCount = randomInt(1, 2);
      const pPositions: string[] = [];
      while (pPositions.length < posCount) {
        const pos = positionsWithoutMB[randomInt(0, positionsWithoutMB.length - 1)];
        if (!pPositions.includes(pos)) pPositions.push(pos);
      }

      roster.push({
        id: `other_${i}`,
        name: `Other ${i}`,
        mmr: 1200,
        positions: pPositions,
        active_positions: null,
        games_played_today: 0,
      });
    }

    let lastWinningTeam: string[] = [];
    let lastLosingTeam: string[] = [];

    for (let game = 1; game <= 20; game++) {
      const { teamA, teamB, teamAPositions, teamBPositions } = draftStrictTeams(roster, lastWinningTeam, lastLosingTeam);
      
      const matchData = simulateMatchTimeline(teamA, teamB, teamAPositions, teamBPositions, roster, false);
      const playerRecords = Object.fromEntries(roster.map(p => [p.id, { id: p.id, mmr: p.mmr, positions: p.positions }]));
      const updates = calculateMmrChanges(matchData, playerRecords);

      updates.forEach(update => {
        const p = roster.find(r => r.id === update.playerId);
        if (p) {
          p.mmr = update.newMmr;
          p.games_played_today += update.queueIncrement;
        }
      });

      if (matchData.team_a_score > matchData.team_b_score) {
        lastWinningTeam = matchData.team_a_players;
        lastLosingTeam = matchData.team_b_players;
      } else {
        lastWinningTeam = matchData.team_b_players;
        lastLosingTeam = matchData.team_a_players;
      }
    }

    console.log("--- 2 MBs SCENARIO RESULTS (20 Games) ---");
    console.log("MB 1 Games Played:", roster[0].games_played_today);
    console.log("MB 2 Games Played:", roster[1].games_played_today);
    
    const othersGames = roster.slice(2).map(p => p.games_played_today);
    console.log("Others Avg Games:", (othersGames.reduce((a,b)=>a+b, 0) / 18).toFixed(1));
    console.log("Others Min Games:", Math.min(...othersGames));
    console.log("Others Max Games:", Math.max(...othersGames));
    console.log("-----------------------------------------");
  });

});
