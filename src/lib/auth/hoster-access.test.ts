import { describe, expect, it } from 'vitest'
import {
  GRANT_PRESETS,
  hasPermission,
  isGrantActive,
  normalizeInviteEmail,
  permissionsFromPreset,
} from './hoster-access'

describe('hoster-access presets', () => {
  it('maps complete_control to all permissions', () => {
    expect(permissionsFromPreset('complete_control')).toHaveLength(7)
  })

  it('maps run_today to session operations', () => {
    const perms = permissionsFromPreset('run_today')
    expect(perms).toContain('session_live')
    expect(perms).toContain('attendance')
    expect(perms).not.toContain('roster_manage')
  })

  it('maps scorekeeper_only to session_live', () => {
    expect(permissionsFromPreset('scorekeeper_only')).toEqual(['session_live'])
  })

  it('uses custom permissions when preset is custom', () => {
    expect(permissionsFromPreset('custom', ['attendance'])).toEqual(['attendance'])
  })
})

describe('hasPermission', () => {
  it('returns true when permission is included', () => {
    expect(hasPermission(GRANT_PRESETS.run_today, 'session_live')).toBe(true)
  })

  it('returns false when permission is missing', () => {
    expect(hasPermission(GRANT_PRESETS.scorekeeper_only, 'session_end')).toBe(false)
  })
})

describe('isGrantActive', () => {
  it('returns false when revoked', () => {
    expect(isGrantActive({ revoked_at: '2026-01-01', expires_at: null })).toBe(false)
  })

  it('returns false when expired', () => {
    expect(isGrantActive({
      revoked_at: null,
      expires_at: '2020-01-01T00:00:00.000Z',
    })).toBe(false)
  })

  it('returns true for active grant', () => {
    expect(isGrantActive({
      revoked_at: null,
      expires_at: '2099-01-01T00:00:00.000Z',
    })).toBe(true)
  })
})

describe('normalizeInviteEmail', () => {
  it('lowercases and trims email', () => {
    expect(normalizeInviteEmail('  Maria@Mail.COM ')).toBe('maria@mail.com')
  })
})
