import { POSITION_SORT_ORDER, parsePlayerPosition } from '@/types/player'
import type { NextTeamSlot } from '@/lib/matchmaking/types'

export { POSITION_SORT_ORDER as POSITION_ORDER }

function positionSortIndex(pos: string): number {
  const parsed = parsePlayerPosition(pos) ?? 'Any'
  const index = POSITION_SORT_ORDER.indexOf(parsed)
  return index === -1 ? 99 : index
}

export function sortTeamIdsByPos(
  teamIds: string[],
  players: { id: string; positions?: string[] }[],
  positions?: Record<string, string>
): string[] {
  return [...teamIds].sort((a, b) => {
    const pA = players.find(p => p.id === a)
    const pB = players.find(p => p.id === b)
    const posA = (positions && positions[a] && positions[a] !== 'Any') ? positions[a] : (pA?.positions?.[0] || 'Any')
    const posB = (positions && positions[b] && positions[b] !== 'Any') ? positions[b] : (pB?.positions?.[0] || 'Any')
    return positionSortIndex(posA) - positionSortIndex(posB)
  })
}

export function sortPlayersByPos<T extends { id: string; positions?: string[] }>(
  players: T[],
  positions?: Record<string, string>
): T[] {
  return [...players].sort((a, b) => {
    const posA = (positions && positions[a.id] && positions[a.id] !== 'Any') ? positions[a.id] : (a.positions?.[0] || 'Any')
    const posB = (positions && positions[b.id] && positions[b.id] !== 'Any') ? positions[b.id] : (b.positions?.[0] || 'Any')
    return positionSortIndex(posA) - positionSortIndex(posB)
  })
}

export function sortNextTeamSlots(slots: NextTeamSlot[]): NextTeamSlot[] {
  return [...slots].sort((a, b) => positionSortIndex(a.position) - positionSortIndex(b.position))
}
