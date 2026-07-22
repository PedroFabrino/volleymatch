'use client'

import { useEffect, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import type { HosterAccessGrant } from '@/types/host-access'
import { setHostContext } from '../actions'

type SmartLoginPromptProps = {
  grants: HosterAccessGrant[]
  hasOwnActiveSession: boolean
}

function dismissKey(grantId: string) {
  return `vm_dismiss_prompt_${grantId}`
}

export default function SmartLoginPrompt({ grants, hasOwnActiveSession }: SmartLoginPromptProps) {
  const t = useTranslations('HostAccess')
  const [visibleGrant, setVisibleGrant] = useState<HosterAccessGrant | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (hasOwnActiveSession) return

    const now = Date.now()
    const tempGrant = grants.find((g) => {
      if (g.scope !== 'session') return false
      if (localStorage.getItem(dismissKey(g.id))) return false
      if (g.expires_at && new Date(g.expires_at).getTime() <= now) return false
      const withinDay = g.expires_at
        ? new Date(g.expires_at).getTime() - now < 24 * 60 * 60 * 1000
        : true
      return withinDay
    })

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisibleGrant(tempGrant ?? null)
  }, [grants, hasOwnActiveSession])

  if (!visibleGrant) return null

  function dismiss() {
    localStorage.setItem(dismissKey(visibleGrant!.id), '1')
    setVisibleGrant(null)
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
        <h2 className="text-xl font-bold">{t('smartPromptTitle')}</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">{t('smartPromptDesc')}</p>
        <p className="text-xs text-gray-500">{visibleGrant.permissions.join(', ')}</p>
        <div className="flex gap-3">
          <button
            type="button"
            disabled={isPending}
            onClick={() => startTransition(async () => {
              await setHostContext(visibleGrant!.owner_hoster_id, visibleGrant!.id)
              window.location.href = '/dashboard/session'
            })}
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium"
          >
            {t('hostDelegatedGroup')}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="flex-1 border py-2 rounded-lg font-medium"
          >
            {t('goToMyDashboard')}
          </button>
        </div>
      </div>
    </div>
  )
}
