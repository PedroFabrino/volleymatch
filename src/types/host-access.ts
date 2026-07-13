export const HOST_PERMISSIONS = [
  'attendance',
  'roster_add',
  'roster_manage',
  'session_start',
  'session_live',
  'session_end',
  'history_view',
] as const

export type HostPermission = (typeof HOST_PERMISSIONS)[number]

export type GrantScope = 'session' | 'persistent'

export type HosterAccessGrant = {
  id: string
  owner_hoster_id: string
  grantee_user_id: string | null
  invite_email: string | null
  permissions: HostPermission[]
  scope: GrantScope
  session_id: string | null
  expires_at: string | null
  revoked_at: string | null
  granted_by: string
  created_at: string
}

export type HostContextCookie = {
  ownerHosterId: string
  grantId: string
}

export type GrantPresetId = 'complete_control' | 'run_today' | 'scorekeeper_only' | 'custom'
