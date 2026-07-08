import type { Match } from '@/types'
import type { VotingPrompt } from './voting-prompts'

const queueKey = (matchId: string) => `volleymatch_voting_queue_${matchId}`
const retainedMatchKey = (sessionId: string) => `volleymatch_retained_match_${sessionId}`

export function loadStoredQueue(matchId: string): VotingPrompt[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = sessionStorage.getItem(queueKey(matchId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as VotingPrompt[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveStoredQueue(matchId: string, queue: VotingPrompt[]) {
  if (typeof window === 'undefined') return

  const key = queueKey(matchId)
  if (queue.length === 0) {
    sessionStorage.removeItem(key)
    return
  }

  sessionStorage.setItem(key, JSON.stringify(queue))
}

export function loadRetainedMatch(sessionId: string): Match | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = sessionStorage.getItem(retainedMatchKey(sessionId))
    return raw ? (JSON.parse(raw) as Match) : null
  } catch {
    return null
  }
}

export function saveRetainedMatch(sessionId: string, match: Match) {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(retainedMatchKey(sessionId), JSON.stringify(match))
}

export function clearRetainedMatch(sessionId: string) {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(retainedMatchKey(sessionId))
}
