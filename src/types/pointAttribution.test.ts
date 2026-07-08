import { describe, it, expect } from 'vitest'
import { parseStoredSpectatorVote } from './pointAttribution'

describe('parseStoredSpectatorVote', () => {
  it('parses JSON vote with scoring type', () => {
    const raw = JSON.stringify({ playerId: 'player-1', scoringType: 'spike' })
    expect(parseStoredSpectatorVote(raw)).toEqual({
      playerId: 'player-1',
      scoringType: 'spike',
    })
  })

  it('defaults missing scoring type to other', () => {
    const raw = JSON.stringify({ playerId: 'player-1' })
    expect(parseStoredSpectatorVote(raw)).toEqual({
      playerId: 'player-1',
      scoringType: 'other',
    })
  })

  it('supports legacy plain player id strings', () => {
    expect(parseStoredSpectatorVote('player-legacy')).toEqual({
      playerId: 'player-legacy',
      scoringType: 'other',
    })
  })
})
