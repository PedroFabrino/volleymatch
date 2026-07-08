import { useTransition, useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { updateScore, finishMatch, cancelMatch } from './actions'
import { substitutePlayer, swapPositions, swapTeams } from './team-actions'
import type { PlayerPosition } from '@/types/player'
import type { Match } from '@/types'

export function useScoreboardActions(match: Match, sessionId: string) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [subbingPlayer, setSubbingPlayer] = useState<{ id: string; name: string; team: 'a' | 'b' } | null>(null)
  const [swappingPlayer, setSwappingPlayer] = useState<{
    id: string
    name: string
    team: 'a' | 'b'
    position: PlayerPosition
  } | null>(null)

  const [scoreA, setScoreA] = useState(match.team_a_score)
  const [scoreB, setScoreB] = useState(match.team_b_score)

  useEffect(() => {
    setScoreA(match.team_a_score)
    setScoreB(match.team_b_score)
  }, [match.id])

  const touchStartY = useRef<number | null>(null)

  const handleScoreChange = (team: 'a' | 'b', increment: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (team === 'a') setScoreA((prev) => Math.max(0, prev + increment))
    if (team === 'b') setScoreB((prev) => Math.max(0, prev + increment))
    startTransition(() => {
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
    startTransition(async () => {
      await substitutePlayer(match.id, sessionId, subbingPlayer.team, subbingPlayer.id, playerInId)
      setSubbingPlayer(null)
      router.refresh()
    })
  }

  const handleSwapPositions = (targetId: string) => {
    if (!swappingPlayer) return
    startTransition(async () => {
      await swapPositions(match.id, sessionId, swappingPlayer.id, targetId)
      setSwappingPlayer(null)
      router.refresh()
    })
  }

  const handleCancelMatch = () => startTransition(() => cancelMatch(match.id, sessionId))
  const handleSwapTeams = () => startTransition(async () => {
    await swapTeams(match.id, sessionId)
    router.refresh()
  })
  const handleFinishEarly = () => startTransition(() => finishMatch(match.id, sessionId))

  return {
    isPending,
    startTransition,
    subbingPlayer,
    setSubbingPlayer,
    swappingPlayer,
    setSwappingPlayer,
    optScoreA: scoreA,
    optScoreB: scoreB,
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
