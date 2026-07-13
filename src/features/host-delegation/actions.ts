'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { ActionError, assertAuthenticated } from '@/types/action-error'
import type { GrantPresetId, GrantScope, HostPermission } from '@/types/host-access'
import { permissionsFromPreset } from '@/lib/auth/hoster-access'
import { HOST_CONTEXT_COOKIE, serializeHostContext } from '@/lib/auth/host-context'
import {
  createGrant,
  revokeGrant,
  acceptPendingGrant,
  updateGrantPermissions,
  lookupUserIdByEmail,
  getGrantById,
  resolvePendingGrantsForUser,
  listGrantsForGrantee,
} from '@/lib/services/hoster-access.service'

function endOfTodayIso(): string {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d.toISOString()
}

export async function createAccessGrant(input: {
  email: string
  preset: GrantPresetId
  permissions?: HostPermission[]
  scope: GrantScope
  expiresAt?: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  assertAuthenticated(user)

  if (!input.email.trim()) {
    throw new ActionError('grantFailed')
  }

  const permissions = permissionsFromPreset(input.preset, input.permissions)
  if (permissions.length === 0) {
    throw new ActionError('grantFailed')
  }

  const granteeUserId = await lookupUserIdByEmail(input.email)
  const expiresAt = input.scope === 'session'
    ? (input.expiresAt ?? endOfTodayIso())
    : null

  const { data, error } = await createGrant(supabase, {
    ownerHosterId: user.id,
    grantedBy: user.id,
    inviteEmail: input.email,
    granteeUserId,
    permissions,
    scope: input.scope,
    expiresAt,
  })

  if (error || !data) {
    throw new ActionError('grantFailed')
  }

  revalidatePath('/dashboard/access')
  return { grantId: data.id }
}

export async function revokeAccessGrant(grantId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  assertAuthenticated(user)

  const { error } = await revokeGrant(supabase, grantId, user.id)
  if (error) throw new ActionError('grantFailed')

  revalidatePath('/dashboard/access')
}

export async function updateAccessGrantPermissions(
  grantId: string,
  permissions: HostPermission[]
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  assertAuthenticated(user)

  const { error } = await updateGrantPermissions(supabase, grantId, user.id, permissions)
  if (error) throw new ActionError('grantFailed')

  revalidatePath('/dashboard/access')
}

export async function acceptGrantInvite(grantId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  assertAuthenticated(user)

  if (user.email) {
    await resolvePendingGrantsForUser(supabase, user.email, user.id)
  }

  const { data: grant } = await getGrantById(supabase, grantId)
  if (!grant) throw new ActionError('grantFailed')

  if (!grant.grantee_user_id) {
    const { data: accepted, error } = await acceptPendingGrant(supabase, grantId, user.id)
    if (error || !accepted) throw new ActionError('grantFailed')
  } else if (grant.grantee_user_id !== user.id) {
    throw new ActionError('forbidden')
  }

  await setHostContext(grant.owner_hoster_id, grantId)
  revalidatePath('/dashboard')
}

export async function setHostContext(ownerHosterId: string | null, grantId?: string | null) {
  const cookieStore = await cookies()

  if (!ownerHosterId || !grantId) {
    cookieStore.delete(HOST_CONTEXT_COOKIE)
  } else {
    cookieStore.set(HOST_CONTEXT_COOKIE, serializeHostContext({ ownerHosterId, grantId }), {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    })
  }

  revalidatePath('/dashboard')
}

export async function switchToMyGroup() {
  await setHostContext(null)
}

export async function linkPendingGrantsOnLogin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return []

  return resolvePendingGrantsForUser(supabase, user.email, user.id)
}

export async function getDelegateInvites() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  assertAuthenticated(user)

  const { data } = await listGrantsForGrantee(supabase, user.id)
  return data.filter((g) => g.owner_hoster_id !== user.id)
}
