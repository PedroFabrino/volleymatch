import { describe, expect, it } from 'vitest'
import { buildScorePrompts, mergePromptQueue } from './voting-prompts'

describe('buildScorePrompts', () => {
  it('creates one prompt per blue point scored', () => {
    const prompts = buildScorePrompts({ a: 0, b: 0 }, { a: 0, b: 4 })

    expect(prompts).toHaveLength(4)
    expect(prompts.map((prompt) => prompt.id)).toEqual(['0-1', '0-2', '0-3', '0-4'])
    expect(prompts.every((prompt) => prompt.team === 'b')).toBe(true)
  })

  it('creates prompts for mixed team scoring in a single jump', () => {
    const prompts = buildScorePrompts({ a: 0, b: 0 }, { a: 1, b: 4 })

    expect(prompts).toHaveLength(5)
    expect(prompts[0]).toMatchObject({ team: 'a', scoreA: 1, scoreB: 0, id: '1-0' })
    expect(prompts.slice(1).map((prompt) => prompt.id)).toEqual(['1-1', '1-2', '1-3', '1-4'])
  })

  it('ignores score decreases', () => {
    expect(buildScorePrompts({ a: 3, b: 2 }, { a: 2, b: 2 })).toEqual([])
  })

  it('ignores side swaps that mirror scores without new points', () => {
    expect(buildScorePrompts({ a: 6, b: 4 }, { a: 4, b: 6 })).toEqual([])
  })
})

describe('mergePromptQueue', () => {
  it('deduplicates prompts by score snapshot id', () => {
    const existing = [{ id: '1-0', team: 'a' as const, scoreA: 1, scoreB: 0 }]
    const incoming = [
      { id: '1-0', team: 'a' as const, scoreA: 1, scoreB: 0 },
      { id: '1-1', team: 'b' as const, scoreA: 1, scoreB: 1 },
    ]

    expect(mergePromptQueue(existing, incoming)).toEqual([
      { id: '1-0', team: 'a', scoreA: 1, scoreB: 0 },
      { id: '1-1', team: 'b', scoreA: 1, scoreB: 1 },
    ])
  })
})
