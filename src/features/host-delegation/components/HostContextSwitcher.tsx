'use client'

import { useTransition } from 'react'
import { useTranslations } from 'next-intl'
import type { HosterAccessGrant } from '@/types/host-access'
import { setHostContext, switchToMyGroup } from '../actions'

type HostContextSwitcherProps = {
  userId: string
  effectiveHosterId: string
  isSubstituteMode: boolean
  incomingGrants: HosterAccessGrant[]
}

function grantLabel(grant: HosterAccessGrant): string {
  const email = grant.invite_email ?? grant.owner_hoster_id.slice(0, 8)
  return email.split('@')[0]
}

export default function HostContextSwitcher({
  userId,
  effectiveHosterId,
  isSubstituteMode,
  incomingGrants,
}: HostContextSwitcherProps) {
  const t = useTranslations('HostAccess')
  const [isPending, startTransition] = useTransition()

  if (incomingGrants.length === 0 && !isSubstituteMode) return null

  const activeGrant = incomingGrants.find((g) => g.owner_hoster_id === effectiveHosterId)

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="host-context" className="sr-only">{t('switchGroup')}</label>
      <select
        id="host-context"
        disabled={isPending}
        value={isSubstituteMode ? effectiveHosterId : userId}
        onChange={(e) => {
          const value = e.target.value
          startTransition(async () => {
            if (value === userId) {
              await switchToMyGroup()
            } else {
              const grant = incomingGrants.find((g) => g.owner_hoster_id === value)
              if (grant) await setHostContext(grant.owner_hoster_id, grant.id)
            }
            window.location.reload()
          })
        }}
        className="text-sm font-medium bg-white/90 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-1.5"
      >
        <option value={userId}>{t('myGroup')}</option>
        {incomingGrants.map((grant) => (
          <option key={grant.id} value={grant.owner_hoster_id}>
            {t('delegatedGroup', { name: grantLabel(grant) })}
            {grant.scope === 'session' ? ` (${t('substitute')})` : ''}
          </option>
        ))}
      </select>
      {isSubstituteMode && activeGrant?.scope === 'session' && (
        <span className="text-xs font-semibold uppercase tracking-wide bg-amber-200 text-amber-900 px-2 py-0.5 rounded">
          {t('substitute')}
        </span>
      )}
    </div>
  )
}
