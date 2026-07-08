export const POSITION_ORDER = ['Setter', 'Middle Blocker', 'Outside Hitter', 'Opposite Hitter', 'Libero', 'Any']

export function sortPlayersByPos<T extends { id: string; positions?: string[] }>(
  players: T[],
  positions?: Record<string, string>
): T[] {
  return [...players].sort((a, b) => {
    const posA = (positions && positions[a.id] && positions[a.id] !== 'Any') ? positions[a.id] : (a.positions?.[0] || 'Any')
    const posB = (positions && positions[b.id] && positions[b.id] !== 'Any') ? positions[b.id] : (b.positions?.[0] || 'Any')
    const indexA = POSITION_ORDER.indexOf(posA)
    const indexB = POSITION_ORDER.indexOf(posB)
    return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB)
  })
}
