const sortOrder = ['Setter', 'Middle Blocker', 'Outside Hitter', 'Opposite', 'Libero', 'Any'];
const sortPlayersByPos = (teamIds, positions, players) => {
  return [...teamIds].sort((a, b) => {
    const pA = players.find(p => p.id === a);
    const pB = players.find(p => p.id === b);
    const posA = (positions && positions[a] && positions[a] !== 'Any') ? positions[a] : (pA?.positions?.[0] || 'Any');
    const posB = (positions && positions[b] && positions[b] !== 'Any') ? positions[b] : (pB?.positions?.[0] || 'Any');
    const indexA = sortOrder.indexOf(posA);
    const indexB = sortOrder.indexOf(posB);
    return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
  });
}

const players = [
  { id: '1', name: 'Player A', positions: ['Outside Hitter'] },
  { id: '2', name: 'Player B', positions: ['Setter'] },
  { id: '3', name: 'Player C', positions: ['Libero'] },
  { id: '4', name: 'Player D', positions: ['Middle Blocker'] },
  { id: '5', name: 'Player E', positions: ['Opposite'] },
];

const teamIds = ['1', '2', '3', '4', '5'];
const positions = {
  '1': 'Outside Hitter',
  '2': 'Setter',
  '3': 'Libero',
  '4': 'Middle Blocker',
  '5': 'Opposite'
};

console.log(sortPlayersByPos(teamIds, positions, players).map(id => players.find(p => p.id === id).name));
