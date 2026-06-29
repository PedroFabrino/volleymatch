import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  if (line.includes('=')) {
    const [key, ...rest] = line.split('=');
    envVars[key.trim()] = rest.join('=').trim();
  }
});

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
const supabase = createClient(supabaseUrl, supabaseKey);

const getPos = (p) => (p.active_positions && p.active_positions.length > 0) ? p.active_positions : p.positions;
const hasPos = (p, pos) => {
  const pPos = getPos(p);
  if (Array.isArray(pos)) return pos.some(x => pPos.includes(x));
  return pPos.includes(pos);
};

export function draftStrictTeams(allAvailablePlayers, lastMatchWinningTeamIds, lastMatchLosingTeamIds) {
  const availableMBs = allAvailablePlayers.filter(p => hasPos(p, 'Middle Blocker'));
  const availableLiberos = allAvailablePlayers.filter(p => hasPos(p, 'Libero') && !hasPos(p, 'Middle Blocker'));
  const totalMBL = availableMBs.length + availableLiberos.length;

  let targetSize = 7;
  let blueprint = [
    { pos: 'Setter', count: 2 },
    { pos: 'Outside Hitter', count: 4 },
    { pos: 'Opposite', count: 2 },
    { pos: 'Middle Blocker', count: 4 },
    { pos: 'Libero', count: 2 }
  ];

  if (totalMBL < 6) {
    targetSize = 6;
    blueprint = [
      { pos: 'Setter', count: 2 },
      { pos: 'Middle Blocker', count: 2 },
      { pos: 'Outside Hitter', count: 4 },
      { pos: 'Opposite', count: 2 },
      { pos: 'Libero', count: 2 }
    ];
  }

  const sortByDeserving = (a, b) => {
    if (a.games_played_today !== b.games_played_today) {
      return a.games_played_today - b.games_played_today;
    }
    const aPriority = lastMatchWinningTeamIds.includes(a.id) ? 2 : (lastMatchLosingTeamIds.includes(a.id) ? 1 : 0);
    const bPriority = lastMatchWinningTeamIds.includes(b.id) ? 2 : (lastMatchLosingTeamIds.includes(b.id) ? 1 : 0);
    if (aPriority !== bPriority) return bPriority - aPriority;
    return b.mmr - a.mmr;
  };

  let remainingPlayers = [...allAvailablePlayers]
    .sort(() => Math.random() - 0.5)
    .sort(sortByDeserving);

  const teamA = [];
  const teamB = [];
  const teamAPositions = {};
  const teamBPositions = {};

  const getTeamMmr = (t) => t.reduce((s, p) => s + p.mmr, 0);

  // Draft players into exact roles
  for (const requirement of blueprint) {
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
    picked.sort((a, b) => b.mmr - a.mmr);

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

  // Fallback
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
    teamA,
    teamB,
    teamAPositions,
    teamBPositions,
    targetSize
  };
}

async function runTest() {
  const { data: players, error } = await supabase.from('players').select('*');
  if (error || !players) return console.log("error", error);

  console.log(`Fetched ${players.length} players from DB`);

  players.forEach(p => {
    p.games_played_today = 0;
  });
  
  // Pick exactly 14 random players for testing 7v7, or 12 for 6v6. 
  // Let's just pass all players and see what happens (since my algo will slice appropriately based on blueprint!)
  // wait, draftStrictTeams slices candidates from remainingPlayers!
  const draft = draftStrictTeams(players, [], []);
  
  console.log(`=== DRAFT PREVIEW (${draft.targetSize}v${draft.targetSize}) ===`);
  
  const sortOrder = ['Setter', 'Middle Blocker', 'Outside Hitter', 'Opposite', 'Libero', 'Any'];
  const sortFunc = (a, b, positions) => {
    const posA = positions[a.id];
    const posB = positions[b.id];
    const iA = sortOrder.indexOf(posA);
    const iB = sortOrder.indexOf(posB);
    return (iA === -1 ? 99 : iA) - (iB === -1 ? 99 : iB);
  };

  const getPosAbbrev = (pos) => {
    switch (pos) {
      case 'Setter': return 'ST';
      case 'Middle Blocker': return 'MB';
      case 'Outside Hitter': return 'OH';
      case 'Opposite': return 'OP';
      case 'Libero': return 'L';
      default: return pos ? pos.slice(0, 3).toUpperCase() : 'ANY';
    }
  }

  console.log(`Team A (Count: ${draft.teamA.length})`);
  const sortedA = [...draft.teamA].sort((a, b) => sortFunc(a, b, draft.teamAPositions));
  sortedA.forEach(p => {
    const draftedPos = draft.teamAPositions[p.id];
    console.log(`  [${getPosAbbrev(draftedPos)}] ${p.name}`);
  });

  console.log(`\nTeam B (Count: ${draft.teamB.length})`);
  const sortedB = [...draft.teamB].sort((a, b) => sortFunc(a, b, draft.teamBPositions));
  sortedB.forEach(p => {
    const draftedPos = draft.teamBPositions[p.id];
    console.log(`  [${getPosAbbrev(draftedPos)}] ${p.name}`);
  });
}

runTest();
