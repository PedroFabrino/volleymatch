import { describe, it, expect } from 'vitest'
import { buildNextTeamPreview } from './next-team-preview'
import type { Player } from './types'
import type { PlayerPosition } from '@/types/player'

describe('buildNextTeamPreview', () => {
  const createPlayer = (id: string, positions: PlayerPosition[]): Player => ({
    id,
    name: `Player ${id}`,
    mmr: 1500,
    positions,
    active_positions: null,
    games_played_today: 0,
  })

  it('marks unfilled strict slots as TBD when only bench players are available', () => {
    const playing = ['p1', 'p2', 'p3', 'p4']
    const players: Player[] = [
      ...playing.map((id) => createPlayer(id, ['Outside Hitter'])),
      createPlayer('bench-s1', ['Setter']),
      createPlayer('bench-s2', ['Setter']),
      createPlayer('bench-oh1', ['Outside Hitter']),
      createPlayer('bench-oh2', ['Outside Hitter']),
      createPlayer('bench-op1', ['Opposite Hitter']),
      createPlayer('bench-op2', ['Opposite Hitter']),
      createPlayer('bench-mb1', ['Middle Blocker']),
      createPlayer('bench-mb2', ['Middle Blocker']),
      createPlayer('bench-mb3', ['Middle Blocker']),
      createPlayer('bench-mb4', ['Middle Blocker']),
      createPlayer('bench-l1', ['Libero']),
      createPlayer('bench-l2', ['Libero']),
    ]

    const preview = buildNextTeamPreview(players, playing, playing, true, true)
    const tbdCount = [...preview.teamA, ...preview.teamB].filter(slot => slot.isTbd).length

    expect(tbdCount).toBeGreaterThan(0)
    expect([...preview.teamA, ...preview.teamB].some(slot => slot.playerId === 'bench-s1')).toBe(true)
  })

  it('fills the full next team when the entire queue is available', () => {
    const players: Player[] = []
    for (let i = 0; i < 2; i++) players.push(createPlayer(`s${i}`, ['Setter']))
    for (let i = 0; i < 4; i++) players.push(createPlayer(`oh${i}`, ['Outside Hitter']))
    for (let i = 0; i < 2; i++) players.push(createPlayer(`op${i}`, ['Opposite Hitter']))
    for (let i = 0; i < 4; i++) players.push(createPlayer(`mb${i}`, ['Middle Blocker']))
    for (let i = 0; i < 2; i++) players.push(createPlayer(`l${i}`, ['Libero']))

    const preview = buildNextTeamPreview(players, [], [], true, false)
    const filled = [...preview.teamA, ...preview.teamB].filter(slot => !slot.isTbd)

    expect(filled.length).toBe(14)
  })

  it('returns the same preview for repeated calls with identical input', () => {
    const players: Player[] = []
    for (let i = 0; i < 2; i++) players.push(createPlayer(`s${i}`, ['Setter']))
    for (let i = 0; i < 4; i++) players.push(createPlayer(`oh${i}`, ['Outside Hitter']))
    for (let i = 0; i < 2; i++) players.push(createPlayer(`op${i}`, ['Opposite Hitter']))
    for (let i = 0; i < 4; i++) players.push(createPlayer(`mb${i}`, ['Middle Blocker']))
    for (let i = 0; i < 2; i++) players.push(createPlayer(`l${i}`, ['Libero']))

    const first = buildNextTeamPreview(players, [], [], true, false)
    const second = buildNextTeamPreview(players, [], [], true, false)

    expect(first).toEqual(second)
  })
})
