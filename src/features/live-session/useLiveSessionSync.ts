'use client'

import { useEffect, useRef, startTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type UseLiveSessionSyncOptions = {
  sessionId: string
  matchId?: string
  onMatchScores?: (scores: { teamAScore: number; teamBScore: number }) => void
}

export function useLiveSessionSync({
  sessionId,
  matchId,
  onMatchScores,
}: UseLiveSessionSyncOptions) {
  const router = useRouter()
  const onScoresRef = useRef(onMatchScores)
  onScoresRef.current = onMatchScores

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase.channel(`host:live-session:${sessionId}`)

    if (matchId) {
      channel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${matchId}`,
        },
        (payload) => {
          const row = payload.new as { team_a_score: number; team_b_score: number }
          startTransition(() => {
            onScoresRef.current?.({
              teamAScore: row.team_a_score,
              teamBScore: row.team_b_score,
            })
          })
        }
      )
    }

    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'sessions',
        filter: `id=eq.${sessionId}`,
      },
      () => {
        router.refresh()
      }
    )

    channel.subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, matchId, router])
}
