'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function RealtimeSubscriber({ sessionId }: { sessionId: string }) {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // We subscribe to all changes on matches and session_players where session_id matches
    const matchesChannel = supabase.channel('public:matches')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches', filter: `session_id=eq.${sessionId}` },
        () => {
          // Whenever the match changes (score update, match ended), we refresh the page
          router.refresh()
        }
      )
      .subscribe()

    const sessionsChannel = supabase.channel('public:sessions')
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
      supabase.removeChannel(matchesChannel)
      supabase.removeChannel(sessionsChannel)
    }
  }, [sessionId, router, supabase])

  // Invisible component
  return null
}
