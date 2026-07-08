'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { joinSessionAction } from '../actions'
import { Session } from '@/types/session'
import { Player, PlayerPosition, SELECTABLE_POSITIONS } from '@/types/player'

const ALL_POSITIONS = SELECTABLE_POSITIONS

export default function PlayerJoinForm({
  session,
  players,
}: {
  session: Session & { pin: string }
  players: Player[]
}) {
  const router = useRouter()
  const t = useTranslations('PublicJoin')
  const tPos = useTranslations('Positions')
  const tRoster = useTranslations('Roster')

  const [name, setName] = useState('')
  const [positions, setPositions] = useState<PlayerPosition[]>([])
  const [tier, setTier] = useState('Intermediate')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const availablePlayers = players.filter(p => !p.is_present_today)
  const presentPlayers = players.filter(p => p.is_present_today)

  const matchedAvailable = availablePlayers.find(
    p => p.name.toLowerCase() === name.toLowerCase().trim()
  )
  const matchedPresent = presentPlayers.find(
    p => p.name.toLowerCase() === name.toLowerCase().trim()
  )

  const isReturning = !!matchedAvailable

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    if (matchedPresent) {
      setError(t('alreadyInSession'))
      setTimeout(() => router.push(`/view/${session.pin}`), 2000)
      return
    }

    if (!isReturning && positions.length === 0) {
      setError(t('selectPosition'))
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('sessionId', session.id)
      formData.append('pin', session.pin)
      formData.append('name', name.trim())

      if (isReturning) {
        formData.append('playerId', matchedAvailable.id)
      } else {
        formData.append('initial_tier', tier)
        positions.forEach(pos => formData.append('positions', pos))
      }

      const res = await joinSessionAction(formData)
      if ('error' in res) {
        setError(t(`errors.${res.error}`))
        setIsSubmitting(false)
        return
      }
      if (res.success) {
        router.push(`/view/${session.pin}`)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('joinFailed'))
      setIsSubmitting(false)
    }
  }

  function togglePos(pos: PlayerPosition) {
    if (positions.includes(pos)) {
      setPositions(positions.filter(p => p !== pos))
    } else {
      setPositions([...positions, pos])
    }
  }

  return (
    <div className="bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-700">
      <h2 className="text-2xl font-black mb-6 text-white text-center">{t('whoAreYou')}</h2>

      {error && (
        <div className="mb-4 bg-red-900/50 border border-red-500 text-red-200 px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div>
          <label className="block text-sm font-bold text-gray-400 mb-2">{t('yourName')}</label>
          <input
            type="text"
            list="available-players"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t('namePlaceholder')}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
            required
            autoComplete="off"
          />
          <datalist id="available-players">
            {availablePlayers.map(p => (
              <option key={p.id} value={p.name} />
            ))}
          </datalist>
        </div>

        {matchedAvailable && (
          <div className="bg-green-900/30 border border-green-800 p-4 rounded-xl text-center animate-pulse">
            <p className="text-green-400 font-bold mb-1">
              {t('welcomeBack', { name: matchedAvailable.name })}
            </p>
            <p className="text-sm text-gray-400">{t('profileFound')}</p>
          </div>
        )}

        {!isReturning && name.trim().length > 0 && !matchedPresent && (
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-top-4 duration-300">
            <div>
              <label className="block text-sm font-bold text-gray-400 mb-3">{t('positionsLabel')}</label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_POSITIONS.map(pos => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => togglePos(pos)}
                    className={`p-2 rounded-lg text-sm font-bold transition border ${
                      positions.includes(pos)
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    {tPos(pos)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-400 mb-3">{t('skillTier')}</label>
              <select
                value={tier}
                onChange={e => setTier(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="Beginner">{tRoster('beginner')}</option>
                <option value="Intermediate">{tRoster('intermediate')}</option>
                <option value="Advanced">{tRoster('advanced')}</option>
              </select>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !name.trim()}
          className="w-full mt-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black py-4 rounded-xl transition shadow-lg shadow-blue-900/50"
        >
          {isSubmitting ? t('joining') : t('joinGame')}
        </button>
      </form>
    </div>
  )
}
