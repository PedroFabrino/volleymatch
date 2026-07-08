'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function RealtimeSubscriber({ sessionId }: { sessionId: string }) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    let timeoutId: NodeJS.Timeout
    const debouncedRefresh = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        router.refresh()
      }, 500)
    }

    // We subscribe to all changes on matches and session_players where session_id matches
    const matchesChannel = supabase.channel(`spectator:matches:${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches', filter: `session_id=eq.${sessionId}` },
        () => {
          // Whenever the match changes (score update, match ended), we refresh the page
          debouncedRefresh()
        }
      )
      .subscribe()

    const sessionsChannel = supabase.channel(`spectator:sessions:${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` },
        () => {
          // If session ends, we should refresh to be kicked out
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      clearTimeout(timeoutId)
      supabase.removeChannel(matchesChannel)
      supabase.removeChannel(sessionsChannel)
    }
  }, [sessionId, router])

  // Invisible component
  return null
}
