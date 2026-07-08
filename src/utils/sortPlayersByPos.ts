import { POSITION_SORT_ORDER } from '@/types/player'

export { POSITION_SORT_ORDER as POSITION_ORDER }

export function sortPlayersByPos<T extends { id: string; positions?: string[] }>(
  players: T[],
  positions?: Record<string, string>
): T[] {
  return [...players].sort((a, b) => {
    const posA = (positions && positions[a.id] && positions[a.id] !== 'Any') ? positions[a.id] : (a.positions?.[0] || 'Any')
    const posB = (positions && positions[b.id] && positions[b.id] !== 'Any') ? positions[b.id] : (b.positions?.[0] || 'Any')
    const indexA = POSITION_SORT_ORDER.indexOf(posA as typeof POSITION_SORT_ORDER[number])
    const indexB = POSITION_SORT_ORDER.indexOf(posB as typeof POSITION_SORT_ORDER[number])
    return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB)
  })
}
