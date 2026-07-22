import type { PlayerPosition } from '@/types/player'
import type { NextTeamPreview, NextTeamSlot, Player } from './types'
import { draftTeams } from './draft'
import { orderQueueGroupDeterministic, orderPlayersForNextTeamPreview } from './strict-draft'

const SLOT_SORT_ORDER: PlayerPosition[] = [
  'Setter',
  'Outside Hitter',
  'Opposite Hitter',
  'Middle Blocker',
  'Libero',
  'Any',
]

function sortNextTeamSlots(slots: NextTeamSlot[]): NextTeamSlot[] {
  return [...slots].sort((a, b) => {
    const orderA = SLOT_SORT_ORDER.indexOf(a.position)
    const orderB = SLOT_SORT_ORDER.indexOf(b.position)
    return (orderA === -1 ? 99 : orderA) - (orderB === -1 ? 99 : orderB)
  })
}

const POSITION_BLUEPRINT: Array<{ pos: PlayerPosition; count: number }> = [
  { pos: 'Setter', count: 2 },
  { pos: 'Outside Hitter', count: 4 },
  { pos: 'Opposite Hitter', count: 2 },
  { pos: 'Middle Blocker', count: 4 },
  { pos: 'Libero', count: 2 },
]

const POSITION_BLUEPRINT_FALLBACK: Array<{ pos: PlayerPosition; count: number }> = [
  { pos: 'Setter', count: 2 },
  { pos: 'Middle Blocker', count: 2 },
  { pos: 'Outside Hitter', count: 4 },
  { pos: 'Opposite Hitter', count: 2 },
  { pos: 'Libero', count: 2 },
]

function resolveBlueprint(allAvailablePlayers: Player[]) {
  const getPos = (p: Player) => (p.active_positions && p.active_positions.length > 0) ? p.active_positions : p.positions
  const hasPos = (p: Player, pos: PlayerPosition) => getPos(p).includes(pos)

  const availableMBs = allAvailablePlayers.filter(p => hasPos(p, 'Middle Blocker'))
  const availableLiberos = allAvailablePlayers.filter(p => hasPos(p, 'Libero') && !hasPos(p, 'Middle Blocker'))
  const totalMBL = availableMBs.length + availableLiberos.length

  if (totalMBL < 6) {
    return { targetSize: 6, blueprint: [...POSITION_BLUEPRINT_FALLBACK] }
  }

  return { targetSize: 7, blueprint: [...POSITION_BLUEPRINT] }
}

function emptySlot(position: PlayerPosition): NextTeamSlot {
  return { position, playerId: null, playerName: null, isTbd: true }
}

function playerSlot(position: PlayerPosition, player: Player): NextTeamSlot {
  return { position, playerId: player.id, playerName: player.name, isTbd: false }
}

function padTeamSlots(slots: NextTeamSlot[], targetSize: number): NextTeamSlot[] {
  const padded = [...slots]
  while (padded.length < targetSize) {
    padded.push(emptySlot('Any'))
  }
  return sortNextTeamSlots(padded)
}

function countPosition(slots: NextTeamSlot[], position: PlayerPosition) {
  return slots.filter(slot => slot.position === position).length
}

function teamMmr(slots: NextTeamSlot[], playerMap: Map<string, Player>) {
  return slots.reduce((sum, slot) => sum + (slot.playerId ? (playerMap.get(slot.playerId)?.mmr ?? 0) : 0), 0)
}

function draftStrictFromPool(
  pool: Player[],
  allAvailablePlayers: Player[],
  allowPartial: boolean,
): NextTeamPreview {
  const getPos = (p: Player) => (p.active_positions && p.active_positions.length > 0) ? p.active_positions : p.positions
  const hasPos = (p: Player, pos: PlayerPosition | PlayerPosition[]) => {
    const pPos = getPos(p)
    if (Array.isArray(pos)) return pos.some(x => pPos.includes(x))
    return pPos.includes(pos)
  }

  const { targetSize, blueprint } = resolveBlueprint(allAvailablePlayers)
  const availableLiberos = allAvailablePlayers.filter(p => hasPos(p, 'Libero') && !hasPos(p, 'Middle Blocker'))
  const pureLiberos = new Set(availableLiberos.map(p => p.id))
  const playerMap = new Map(allAvailablePlayers.map(p => [p.id, p]))

  let remainingPlayers = [...pool]
  const teamASlots: NextTeamSlot[] = []
  const teamBSlots: NextTeamSlot[] = []

  for (const requirement of blueprint) {
    const candidates = remainingPlayers.filter(p => hasPos(p, requirement.pos))

    if (targetSize === 6 && candidates.length < requirement.count) {
      if (requirement.pos === 'Middle Blocker') {
        const extra = remainingPlayers.filter(p => !candidates.includes(p) && hasPos(p, 'Libero') && hasPos(p, 'Middle Blocker'))
        candidates.push(...extra)
      } else if (requirement.pos === 'Libero') {
        const extra = remainingPlayers.filter(p => !candidates.includes(p) && hasPos(p, 'Middle Blocker'))
        candidates.push(...extra)
      }
    }

    let picked = candidates.slice(0, requirement.count)
    if (requirement.pos === 'Middle Blocker') {
      picked = picked.filter(p => !pureLiberos.has(p.id))
    }

    if (!allowPartial && picked.length < requirement.count) {
      const needed = requirement.count - picked.length
      const fallbacks = remainingPlayers.filter(p => !picked.includes(p) && !pureLiberos.has(p.id)).slice(0, needed)
      picked.push(...fallbacks)
    }

    picked.sort((a, b) => b.mmr - a.mmr)
    const maxPerTeam = requirement.count / 2

    for (let slotIndex = 0; slotIndex < requirement.count; slotIndex++) {
      const player = picked[slotIndex]
      const countA = countPosition(teamASlots, requirement.pos)
      const countB = countPosition(teamBSlots, requirement.pos)
      const assignToA = countA < maxPerTeam && (countB >= maxPerTeam || teamMmr(teamASlots, playerMap) <= teamMmr(teamBSlots, playerMap))

      if (player) {
        const slot = playerSlot(requirement.pos, player)
        if (assignToA) teamASlots.push(slot)
        else teamBSlots.push(slot)
        remainingPlayers = remainingPlayers.filter(p => p.id !== player.id)
      } else if (allowPartial) {
        const slot = emptySlot(requirement.pos)
        if (assignToA) teamASlots.push(slot)
        else teamBSlots.push(slot)
      }
    }
  }

  return {
    teamA: padTeamSlots(teamASlots, targetSize),
    teamB: padTeamSlots(teamBSlots, targetSize),
    targetSize,
  }
}

function buildCasualPreview(pool: Player[], targetSize: number): NextTeamPreview {
  const { teamA, teamB } = draftTeams(pool.slice(0, targetSize * 2))
  const playerMap = new Map(pool.map(p => [p.id, p]))

  const toSlots = (teamIds: string[]) => {
    const slots = teamIds.map((id) => {
      const player = playerMap.get(id)
      return player ? playerSlot('Any', player) : emptySlot('Any')
    })
    return padTeamSlots(slots, targetSize)
  }

  return {
    teamA: toSlots(teamA),
    teamB: toSlots(teamB),
    targetSize,
  }
}

export function buildNextTeamPreview(
  allAvailablePlayers: Player[],
  lastMatchWinningTeamIds: string[],
  lastMatchLosingTeamIds: string[],
  isStrictMode: boolean,
  fillFromBenchOnly: boolean,
): NextTeamPreview {
  const lastMatchAllIds = new Set([...lastMatchWinningTeamIds, ...lastMatchLosingTeamIds])
  const benchPlayers = orderQueueGroupDeterministic(allAvailablePlayers.filter(p => !lastMatchAllIds.has(p.id)))
  const { targetSize } = resolveBlueprint(allAvailablePlayers)

  if (!isStrictMode) {
    const pool = fillFromBenchOnly
      ? benchPlayers
      : orderQueueGroupDeterministic(allAvailablePlayers)
    return buildCasualPreview(pool, 6)
  }

  if (fillFromBenchOnly) {
    return draftStrictFromPool(benchPlayers, allAvailablePlayers, true)
  }

  const fullQueue = orderPlayersForNextTeamPreview(
    allAvailablePlayers,
    lastMatchWinningTeamIds,
    lastMatchLosingTeamIds,
  )
  return draftStrictFromPool(fullQueue, allAvailablePlayers, false)
}
