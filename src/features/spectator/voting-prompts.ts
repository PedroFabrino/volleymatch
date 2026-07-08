export type VotingPrompt = {
  id: string
  team: 'a' | 'b'
  scoreA: number
  scoreB: number
}

export function buildPromptId(scoreA: number, scoreB: number) {
  return `${scoreA}-${scoreB}`
}

export function buildVotingPrompt(team: 'a' | 'b', scoreA: number, scoreB: number): VotingPrompt {
  return { id: buildPromptId(scoreA, scoreB), team, scoreA, scoreB }
}

export function buildScorePrompts(
  prev: { a: number; b: number },
  next: { a: number; b: number }
): VotingPrompt[] {
  const prompts: VotingPrompt[] = []
  let tempA = prev.a
  let tempB = prev.b

  while (tempA < next.a) {
    tempA += 1
    prompts.push(buildVotingPrompt('a', tempA, tempB))
  }

  while (tempB < next.b) {
    tempB += 1
    prompts.push(buildVotingPrompt('b', tempA, tempB))
  }

  return prompts
}

export function mergePromptQueue(current: VotingPrompt[], incoming: VotingPrompt[]): VotingPrompt[] {
  if (incoming.length === 0) return current

  const next = [...current]
  for (const prompt of incoming) {
    if (!next.some((item) => item.id === prompt.id)) {
      next.push(prompt)
    }
  }
  return next
}
