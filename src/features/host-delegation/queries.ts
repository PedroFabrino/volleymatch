'use server'

import { createClient } from '@/lib/supabase/server'
import { getHostContextFromCookie } from '@/lib/auth/host-context'
import { listGrantsForGrantee, listGrantsForOwner } from '@/lib/services/hoster-access.service'
import type { HostPermission } from '@/types/host-access'
import { ALL_HOST_PERMISSIONS } from '@/lib/auth/hoster-access'
import { getEffectivePermissions } from '@/lib/services/hoster-access.service'

export async function getDashboardHostContext(userId: string) {
  const supabase = await createClient()
  const hostContext = await getHostContextFromCookie()
  const effectiveHosterId = hostContext?.ownerHosterId ?? userId
  const isSubstituteMode = effectiveHosterId !== userId

  const permissions: HostPermission[] = isSubstituteMode
    ? await getEffectivePermissions(supabase, userId, effectiveHosterId)
    : [...ALL_HOST_PERMISSIONS]

  const [{ data: ownedGrants }, { data: delegateGrants }] = await Promise.all([
    listGrantsForOwner(supabase, userId),
    listGrantsForGrantee(supabase, userId),
  ])

  const incomingGrants = (delegateGrants ?? []).filter(
    (g) => g.owner_hoster_id !== userId
  )

  return {
    hostContext,
    effectiveHosterId,
    isSubstituteMode,
    permissions,
    ownedGrants: ownedGrants ?? [],
    incomingGrants,
  }
}
