export type ScoringType = 'spike' | 'block' | 'ace' | 'other'

export const SCORING_TYPES: ScoringType[] = ['spike', 'block', 'ace', 'other']

export const SCORING_TYPE_EMOJI: Record<ScoringType, string> = {
  spike: '🏃',
  block: '🛡️',
  ace: '🚀',
  other: '❓',
}

export type StoredSpectatorVote = {
  playerId: string
  scoringType: ScoringType
  playerName?: string
}

export function parseStoredSpectatorVote(raw: string): StoredSpectatorVote | null {
  try {
    const parsed = JSON.parse(raw) as Partial<StoredSpectatorVote>
    if (typeof parsed.playerId !== 'string') return null
    const scoringType = parsed.scoringType
    if (scoringType && !SCORING_TYPES.includes(scoringType)) return null
    return {
      playerId: parsed.playerId,
      scoringType: scoringType ?? 'other',
      playerName: typeof parsed.playerName === 'string' ? parsed.playerName : undefined,
    }
  } catch {
    return { playerId: raw, scoringType: 'other' }
  }
}
