import { useTransition, useOptimistic, useRef, useState } from 'react'
import { updateScore, finishMatch, cancelMatch } from './actions'
import { substitutePlayer, swapPositions, swapTeams } from './team-actions'
import type { PlayerPosition } from '@/types/player'
import type { Match } from '@/types'

export function useScoreboardActions(match: Match, sessionId: string) {
  const [isPending, startTransition] = useTransition()
  const [subbingPlayer, setSubbingPlayer] = useState<{ id: string; name: string; team: 'a' | 'b' } | null>(null)
  const [swappingPlayer, setSwappingPlayer] = useState<{
    id: string
    name: string
    team: 'a' | 'b'
    position: PlayerPosition
  } | null>(null)

  const [optScoreA, addOptScoreA] = useOptimistic(
    match.team_a_score,
    (state: number, increment: number) => Math.max(0, state + increment)
  )

  const [optScoreB, addOptScoreB] = useOptimistic(
    match.team_b_score,
    (state: number, increment: number) => Math.max(0, state + increment)
  )

  const touchStartY = useRef<number | null>(null)

  const handleScoreChange = (team: 'a' | 'b', increment: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    startTransition(() => {
      if (team === 'a') addOptScoreA(increment)
      if (team === 'b') addOptScoreB(increment)
      updateScore(match.id, sessionId, team, increment)
    })
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent, team: 'a' | 'b') => {
    if (touchStartY.current === null) return
    const touchEndY = e.changedTouches[0].clientY
    const diff = touchEndY - touchStartY.current

    if (diff > 50) {
      handleScoreChange(team, -1)
    }
    touchStartY.current = null
  }

  const handleSubstitute = (playerInId: string) => {
    if (!subbingPlayer) return
    startTransition(() => {
      substitutePlayer(match.id, sessionId, subbingPlayer.team, subbingPlayer.id, playerInId)
      setSubbingPlayer(null)
    })
  }

  const handleSwapPositions = (targetId: string) => {
    if (!swappingPlayer) return
    startTransition(() => {
      swapPositions(match.id, sessionId, swappingPlayer.id, targetId)
      setSwappingPlayer(null)
    })
  }

  const handleCancelMatch = () => startTransition(() => cancelMatch(match.id, sessionId))
  const handleSwapTeams = () => startTransition(() => swapTeams(match.id, sessionId))
  const handleFinishEarly = () => startTransition(() => finishMatch(match.id, sessionId))

  return {
    isPending,
    startTransition,
    subbingPlayer,
    setSubbingPlayer,
    swappingPlayer,
    setSwappingPlayer,
    optScoreA,
    optScoreB,
    handleScoreChange,
    handleTouchStart,
    handleTouchEnd,
    handleSubstitute,
    handleSwapPositions,
    handleCancelMatch,
    handleSwapTeams,
    handleFinishEarly,
  }
}
