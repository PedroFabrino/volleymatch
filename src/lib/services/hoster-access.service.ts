import type { TypedSupabaseClient } from '@/types/supabase'
import type { GrantScope, HostPermission, HosterAccessGrant } from '@/types/host-access'
import { isGrantActive, normalizeInviteEmail } from '@/lib/auth/hoster-access'

type GrantRow = {
  id: string
  owner_hoster_id: string
  grantee_user_id: string | null
  invite_email: string | null
  permissions: string[]
  scope: GrantScope
  session_id: string | null
  expires_at: string | null
  revoked_at: string | null
  granted_by: string
  created_at: string
}

function mapGrantRow(row: GrantRow): HosterAccessGrant {
  return {
    id: row.id,
    owner_hoster_id: row.owner_hoster_id,
    grantee_user_id: row.grantee_user_id,
    invite_email: row.invite_email,
    permissions: row.permissions as HostPermission[],
    scope: row.scope,
    session_id: row.session_id,
    expires_at: row.expires_at,
    revoked_at: row.revoked_at,
    granted_by: row.granted_by,
    created_at: row.created_at,
  }
}

function isSessionGrantApplicable(
  grant: HosterAccessGrant,
  sessionId?: string
): boolean {
  if (grant.scope === 'persistent') return true
  if (!sessionId) return grant.session_id === null
  return grant.session_id === null || grant.session_id === sessionId
}

export async function createGrant(
  supabase: TypedSupabaseClient,
  input: {
    ownerHosterId: string
    grantedBy: string
    inviteEmail: string
    granteeUserId?: string | null
    permissions: HostPermission[]
    scope: GrantScope
    sessionId?: string | null
    expiresAt?: string | null
  }
) {
  const { data, error } = await supabase
    .from('hoster_access_grants')
    .insert({
      owner_hoster_id: input.ownerHosterId,
      granted_by: input.grantedBy,
      invite_email: normalizeInviteEmail(input.inviteEmail),
      grantee_user_id: input.granteeUserId ?? null,
      permissions: input.permissions,
      scope: input.scope,
      session_id: input.sessionId ?? null,
      expires_at: input.expiresAt ?? null,
    })
    .select('*')
    .single()

  return { data: data ? mapGrantRow(data as GrantRow) : null, error }
}

export async function revokeGrant(supabase: TypedSupabaseClient, grantId: string, ownerHosterId: string) {
  const { error } = await supabase
    .from('hoster_access_grants')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', grantId)
    .eq('owner_hoster_id', ownerHosterId)
    .is('revoked_at', null)

  return { error }
}

export async function updateGrantPermissions(
  supabase: TypedSupabaseClient,
  grantId: string,
  ownerHosterId: string,
  permissions: HostPermission[]
) {
  const { data, error } = await supabase
    .from('hoster_access_grants')
    .update({ permissions })
    .eq('id', grantId)
    .eq('owner_hoster_id', ownerHosterId)
    .is('revoked_at', null)
    .select('*')
    .single()

  return { data: data ? mapGrantRow(data as GrantRow) : null, error }
}

export async function linkGrantToSession(
  supabase: TypedSupabaseClient,
  grantId: string,
  sessionId: string
) {
  const { error } = await supabase
    .from('hoster_access_grants')
    .update({ session_id: sessionId })
    .eq('id', grantId)
    .eq('scope', 'session')
    .is('session_id', null)

  return { error }
}

export async function listGrantsForOwner(
  supabase: TypedSupabaseClient,
  ownerHosterId: string
) {
  const { data, error } = await supabase
    .from('hoster_access_grants')
    .select('*')
    .eq('owner_hoster_id', ownerHosterId)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })

  return {
    data: (data ?? []).map((row) => mapGrantRow(row as GrantRow)),
    error,
  }
}

export async function listGrantsForGrantee(
  supabase: TypedSupabaseClient,
  granteeUserId: string
) {
  const { data, error } = await supabase
    .from('hoster_access_grants')
    .select('*')
    .eq('grantee_user_id', granteeUserId)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })

  const grants = (data ?? [])
    .map((row) => mapGrantRow(row as GrantRow))
    .filter((g) => isGrantActive(g))

  return { data: grants, error }
}

export async function listPendingGrantsByEmail(
  supabase: TypedSupabaseClient,
  email: string
) {
  const normalized = normalizeInviteEmail(email)
  const { data, error } = await supabase
    .from('hoster_access_grants')
    .select('*')
    .is('grantee_user_id', null)
    .is('revoked_at', null)
    .ilike('invite_email', normalized)

  const grants = (data ?? [])
    .map((row) => mapGrantRow(row as GrantRow))
    .filter((g) => isGrantActive(g))

  return { data: grants, error }
}

export async function acceptPendingGrant(
  supabase: TypedSupabaseClient,
  grantId: string,
  granteeUserId: string
) {
  const { data, error } = await supabase
    .from('hoster_access_grants')
    .update({ grantee_user_id: granteeUserId })
    .eq('id', grantId)
    .is('grantee_user_id', null)
    .select('*')
    .single()

  return { data: data ? mapGrantRow(data as GrantRow) : null, error }
}

export async function resolvePendingGrantsForUser(
  supabase: TypedSupabaseClient,
  email: string,
  userId: string
) {
  const { data: pending } = await listPendingGrantsByEmail(supabase, email)
  const linked: HosterAccessGrant[] = []

  for (const grant of pending) {
    const { data } = await acceptPendingGrant(supabase, grant.id, userId)
    if (data) linked.push(data)
  }

  return linked
}

export async function getGrantById(
  supabase: TypedSupabaseClient,
  grantId: string
) {
  const { data, error } = await supabase
    .from('hoster_access_grants')
    .select('*')
    .eq('id', grantId)
    .maybeSingle()

  return { data: data ? mapGrantRow(data as GrantRow) : null, error }
}

export async function getEffectivePermissions(
  supabase: TypedSupabaseClient,
  granteeUserId: string,
  ownerHosterId: string,
  sessionId?: string
): Promise<HostPermission[]> {
  const { data } = await supabase
    .from('hoster_access_grants')
    .select('*')
    .eq('grantee_user_id', granteeUserId)
    .eq('owner_hoster_id', ownerHosterId)
    .is('revoked_at', null)

  const active = (data ?? [])
    .map((row) => mapGrantRow(row as GrantRow))
    .filter((g) => isGrantActive(g) && isSessionGrantApplicable(g, sessionId))

  const merged = new Set<HostPermission>()
  for (const grant of active) {
    for (const p of grant.permissions) {
      merged.add(p)
    }
  }
  return [...merged]
}

export async function lookupUserIdByEmail(email: string): Promise<string | null> {
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()
  const normalized = normalizeInviteEmail(email)

  let page = 1
  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error || !data.users.length) break

    const found = data.users.find((u) => u.email?.toLowerCase() === normalized)
    if (found) return found.id

    if (data.users.length < 200) break
    page += 1
  }

  return null
}
