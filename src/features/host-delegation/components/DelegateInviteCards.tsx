'use client'

import { useTransition } from 'react'
import { useTranslations } from 'next-intl'
import type { HosterAccessGrant } from '@/types/host-access'
import { setHostContext } from '../actions'

type DelegateInviteCardsProps = {
  grants: HosterAccessGrant[]
}

export default function DelegateInviteCards({ grants }: DelegateInviteCardsProps) {
  const t = useTranslations('HostAccess')
  const [isPending, startTransition] = useTransition()

  if (grants.length === 0) return null

  return (
    <div className="space-y-3">
      {grants.map((grant) => (
        <div
          key={grant.id}
          className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        >
          <div>
            <p className="font-semibold">{t('inviteCardTitle')}</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {t('inviteCardDesc', {
                scope: grant.scope === 'session' ? t('tempAccess') : t('fullTimeAccess'),
              })}
            </p>
          </div>
          <button
            type="button"
            disabled={isPending}
            onClick={() => startTransition(async () => {
              await setHostContext(grant.owner_hoster_id, grant.id)
              window.location.href = '/dashboard/session'
            })}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            {t('switchToGroup')}
          </button>
        </div>
      ))}
    </div>
  )
}
