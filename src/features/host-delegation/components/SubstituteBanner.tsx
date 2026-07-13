import { getTranslations } from 'next-intl/server'
import type { HostPermission } from '@/types/host-access'

type SubstituteBannerProps = {
  ownerLabel: string
  permissions: HostPermission[]
  expiresAt: string | null
}

export default async function SubstituteBanner({
  ownerLabel,
  permissions,
  expiresAt,
}: SubstituteBannerProps) {
  const t = await getTranslations('HostAccess')

  const expiryText = expiresAt
    ? new Date(expiresAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="bg-amber-500 text-amber-950 px-4 py-2 text-sm font-medium flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
      <span>
        {t('substituteBanner', { name: ownerLabel })}
        {expiryText ? ` · ${t('expiresAt', { time: expiryText })}` : ''}
      </span>
      <span className="text-xs opacity-90">
        {t('permissionsSummary', { list: permissions.join(', ') })}
      </span>
    </div>
  )
}
