import { describe, expect, it } from 'vitest'
import { permissionsFromPreset, hasPermission } from '@/lib/auth/hoster-access'

describe('host access grant allow/deny paths', () => {
  it('scorekeeper cannot end session', () => {
    const perms = permissionsFromPreset('scorekeeper_only')
    expect(hasPermission(perms, 'session_live')).toBe(true)
    expect(hasPermission(perms, 'session_end')).toBe(false)
  })

  it('run today preset allows end but not roster manage', () => {
    const perms = permissionsFromPreset('run_today')
    expect(hasPermission(perms, 'session_end')).toBe(true)
    expect(hasPermission(perms, 'roster_manage')).toBe(false)
  })

  it('complete control allows all operations', () => {
    const perms = permissionsFromPreset('complete_control')
    expect(hasPermission(perms, 'roster_manage')).toBe(true)
    expect(hasPermission(perms, 'history_view')).toBe(true)
  })
})
