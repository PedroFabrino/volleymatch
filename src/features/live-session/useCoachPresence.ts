'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'

type CoachPresence = {
  userId: string
  label: string
}

export function useCoachPresence(sessionId: string, userId: string, userLabel: string) {
  const t = useTranslations('HostAccess')
  const [coaches, setCoaches] = useState<CoachPresence[]>([])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel(`session:${sessionId}:coaches`, {
      config: { presence: { key: userId } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<CoachPresence>()
        const all: CoachPresence[] = []
        Object.values(state).forEach((entries) => {
          entries.forEach((entry) => all.push(entry))
        })
        setCoaches(all)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ userId, label: userLabel || t('you') })
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, userId, userLabel, t])

  const otherCoaches = coaches.filter((c) => c.userId !== userId)
  return { coaches, otherCoaches, hasOtherCoaches: otherCoaches.length > 0 }
}
