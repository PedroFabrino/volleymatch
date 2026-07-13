import type { GrantPresetId, HostPermission } from '@/types/host-access'
import { HOST_PERMISSIONS } from '@/types/host-access'

export const ALL_HOST_PERMISSIONS: HostPermission[] = [...HOST_PERMISSIONS]

export const GRANT_PRESETS: Record<Exclude<GrantPresetId, 'custom'>, HostPermission[]> = {
  complete_control: [...ALL_HOST_PERMISSIONS],
  run_today: ['attendance', 'session_start', 'session_live', 'session_end', 'roster_add'],
  scorekeeper_only: ['session_live'],
}

export function permissionsFromPreset(preset: GrantPresetId, custom?: HostPermission[]): HostPermission[] {
  if (preset === 'custom') {
    return custom ?? []
  }
  return [...GRANT_PRESETS[preset]]
}

export function hasPermission(
  permissions: HostPermission[],
  required: HostPermission
): boolean {
  return permissions.includes(required)
}

export function hasAnyPermission(
  permissions: HostPermission[],
  required: HostPermission[]
): boolean {
  return required.some((p) => permissions.includes(p))
}

export function normalizeInviteEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function isGrantActive(
  grant: { revoked_at: string | null; expires_at: string | null },
  now = new Date()
): boolean {
  if (grant.revoked_at) return false
  if (grant.expires_at && new Date(grant.expires_at) <= now) return false
  return true
}

export function formatPermissionList(permissions: HostPermission[]): string {
  return permissions.join(', ')
}
