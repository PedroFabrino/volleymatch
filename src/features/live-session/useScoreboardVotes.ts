import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import type { Player } from '@/types'

export function useScoreboardVotes(sessionId: string, players: Player[]) {
  const t = useTranslations('Scoreboard')
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const activeVotesRef = useRef<Map<string, number>>(new Map())
  const lastScoreSnapshotRef = useRef<{ a: number; b: number } | null>(null)
  const voteDebounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel('public:point_attributions_hoster')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'point_attributions', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          const newVote = payload.new

          if (
            !lastScoreSnapshotRef.current ||
            lastScoreSnapshotRef.current.a !== newVote.score_a ||
            lastScoreSnapshotRef.current.b !== newVote.score_b
          ) {
            activeVotesRef.current = new Map()
            lastScoreSnapshotRef.current = { a: newVote.score_a, b: newVote.score_b }
          }

          const currentVotes = activeVotesRef.current
          currentVotes.set(newVote.attributed_to, (currentVotes.get(newVote.attributed_to) || 0) + 1)

          if (voteDebounceTimeoutRef.current) clearTimeout(voteDebounceTimeoutRef.current)

          voteDebounceTimeoutRef.current = setTimeout(() => {
            let maxVotes = 0
            let winnerId: string | null = null

            activeVotesRef.current.forEach((votes, playerId) => {
              if (votes > maxVotes) {
                maxVotes = votes
                winnerId = playerId
              }
            })

            if (winnerId) {
              const winnerPlayer = players.find(p => p.id === winnerId)
              if (winnerPlayer) {
                setToastMessage(t('spectatorVotedToast', { name: winnerPlayer.name }))
                setTimeout(() => setToastMessage(null), 4000)
              }
            }
          }, 10000)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      if (voteDebounceTimeoutRef.current) clearTimeout(voteDebounceTimeoutRef.current)
    }
  }, [sessionId, players, t])

  return toastMessage
}
