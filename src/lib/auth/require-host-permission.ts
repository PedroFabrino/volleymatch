import type { TypedSupabaseClient } from '@/types/supabase'
import type { HostPermission } from '@/types/host-access'
import { ActionError } from '@/types/action-error'
import { ALL_HOST_PERMISSIONS, hasPermission } from './hoster-access'
import { getEffectivePermissions } from '@/lib/services/hoster-access.service'
import { getHostContextFromCookie } from './host-context'

export type ActingContext = {
  userId: string
  effectiveHosterId: string
  permissions: HostPermission[]
  isSubstituteMode: boolean
  grantId: string | null
}

export async function resolveActingContext(
  supabase: TypedSupabaseClient,
  userId: string,
  sessionId?: string
): Promise<ActingContext> {
  const context = await getHostContextFromCookie()
  const effectiveHosterId = context?.ownerHosterId ?? userId
  const isSubstituteMode = effectiveHosterId !== userId

  const permissions = isSubstituteMode
    ? await getEffectivePermissions(supabase, userId, effectiveHosterId, sessionId)
    : [...ALL_HOST_PERMISSIONS]

  if (isSubstituteMode && permissions.length === 0) {
    throw new ActionError('forbidden')
  }

  return {
    userId,
    effectiveHosterId,
    permissions,
    isSubstituteMode,
    grantId: context?.grantId ?? null,
  }
}

export async function requireHostPermission(
  supabase: TypedSupabaseClient,
  userId: string,
  permission: HostPermission,
  sessionId?: string
): Promise<ActingContext> {
  const ctx = await resolveActingContext(supabase, userId, sessionId)

  if (ctx.effectiveHosterId === userId) {
    return ctx
  }

  if (!hasPermission(ctx.permissions, permission)) {
    throw new ActionError('forbidden')
  }

  return ctx
}
