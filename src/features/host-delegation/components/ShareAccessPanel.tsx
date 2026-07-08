'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import type { GrantPresetId, GrantScope, HostPermission } from '@/types/host-access'
import { GRANT_PRESETS, ALL_HOST_PERMISSIONS } from '@/lib/auth/hoster-access'
import { createAccessGrant, revokeAccessGrant } from '../actions'
import type { HosterAccessGrant } from '@/types/host-access'

type ShareAccessPanelProps = {
  activeGrants: HosterAccessGrant[]
}

const PRESET_IDS: Exclude<GrantPresetId, 'custom'>[] = [
  'complete_control',
  'run_today',
  'scorekeeper_only',
]

export default function ShareAccessPanel({ activeGrants }: ShareAccessPanelProps) {
  const t = useTranslations('HostAccess')
  const [email, setEmail] = useState('')
  const [scope, setScope] = useState<GrantScope>('session')
  const [preset, setPreset] = useState<GrantPresetId>('run_today')
  const [permissions, setPermissions] = useState<HostPermission[]>(GRANT_PRESETS.run_today)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function applyPreset(next: GrantPresetId) {
    setPreset(next)
    if (next !== 'custom') {
      setPermissions([...GRANT_PRESETS[next]])
    }
  }

  function togglePermission(p: HostPermission) {
    setPreset('custom')
    setPermissions((current) =>
      current.includes(p) ? current.filter((x) => x !== p) : [...current, p]
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        await createAccessGrant({
          email,
          preset,
          permissions,
          scope,
        })
        setEmail('')
      } catch {
        setError(t('grantFailed'))
      }
    })
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-2xl shadow p-6 border dark:border-gray-800 space-y-4">
        <h2 className="text-xl font-bold">{t('shareAccessTitle')}</h2>

        <div>
          <label className="block text-sm font-medium mb-1">{t('emailLabel')}</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="person@mail.com"
            className="w-full rounded-lg border px-3 py-2 dark:bg-gray-950 dark:border-gray-700"
          />
        </div>

        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={scope === 'session'}
              onChange={() => setScope('session')}
            />
            {t('tempAccess')}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={scope === 'persistent'}
              onChange={() => setScope('persistent')}
            />
            {t('fullTimeAccess')}
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          {PRESET_IDS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => applyPreset(id)}
              className={`text-xs px-3 py-1.5 rounded-full border ${
                preset === id
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
            >
              {t(`preset_${id}`)}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ALL_HOST_PERMISSIONS.map((p) => (
            <label key={p} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={permissions.includes(p)}
                onChange={() => togglePermission(p)}
              />
              {t(`permission_${p}`)}
            </label>
          ))}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={isPending || permissions.length === 0}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
        >
          {t('sendInvite')}
        </button>
      </form>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-6 border dark:border-gray-800">
        <h3 className="text-lg font-bold mb-4">{t('activeGrants')}</h3>
        {activeGrants.length === 0 ? (
          <p className="text-sm text-gray-500">{t('noActiveGrants')}</p>
        ) : (
          <ul className="space-y-3">
            {activeGrants.map((grant) => (
              <li key={grant.id} className="flex justify-between items-start gap-4 border-b dark:border-gray-800 pb-3">
                <div>
                  <p className="font-medium">{grant.invite_email ?? grant.grantee_user_id}</p>
                  <p className="text-xs text-gray-500">
                    {grant.scope === 'session' ? t('tempAccess') : t('fullTimeAccess')}
                    {' · '}
                    {grant.permissions.join(', ')}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => startTransition(() => revokeAccessGrant(grant.id))}
                  className="text-sm text-red-600 hover:underline"
                >
                  {t('revoke')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
