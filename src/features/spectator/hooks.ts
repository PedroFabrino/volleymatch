import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { resolveTeamPlayers } from '@/utils/resolveTeamPlayers'
import { useSpectatorVoting } from './useSpectatorVoting'
import type { PlayerWithStatus } from '@/lib/matchmaking'
import type { Session, Match } from '@/types'

export function useSpectatorScoreboard(
  session: Session,
  match: Match,
  playersWithStatus: PlayerWithStatus[]
) {
  const t = useTranslations('Scoreboard')

  const [teamsOpen, setTeamsOpen] = useState(false)
  const [queueOpen, setQueueOpen] = useState(true)
  const [elapsed, setElapsed] = useState('00:00')

  const scoringTypeLabels = {
    spike: t('scoringTypeSpike'),
    block: t('scoringTypeBlock'),
    ace: t('scoringTypeAce'),
    other: t('scoringTypeOther'),
  } as const

  const voting = useSpectatorVoting({
    match,
    sessionId: session.id,
    votedForLabel: (name, scoringType) => t('votedForWithType', {
      name,
      type: scoringTypeLabels[scoringType],
    }),
  })

  useEffect(() => {
    const startTime = new Date(match.created_at).getTime()
    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - startTime) / 1000)
      const m = Math.floor(diff / 60).toString().padStart(2, '0')
      const s = (diff % 60).toString().padStart(2, '0')
      setElapsed(`${m}:${s}`)
    }, 1000)
    return () => clearInterval(interval)
  }, [match.created_at])

  const optScoreA = match.team_a_score
  const optScoreB = match.team_b_score
  const isMatchOver = optScoreA >= session.target_score || optScoreB >= session.target_score
  const hasPendingVoting = voting.hasPendingVoting
  const showMatchDoneOverlay = isMatchOver && !hasPendingVoting

  const teamAPlayers = resolveTeamPlayers(match.team_a_players, playersWithStatus)
  const teamBPlayers = resolveTeamPlayers(match.team_b_players, playersWithStatus)
  const benchPlayers = playersWithStatus.filter(
    (p) => !match.team_a_players.includes(p.id) && !match.team_b_players.includes(p.id)
  )

  return {
    teamsOpen,
    setTeamsOpen,
    queueOpen,
    setQueueOpen,
    elapsed,
    ...voting,
    optScoreA,
    optScoreB,
    hasPendingVoting,
    showMatchDoneOverlay,
    teamAPlayers,
    teamBPlayers,
    benchPlayers,
  }
}
