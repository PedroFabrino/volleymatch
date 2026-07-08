'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ArrowRight, Loader2, Play } from 'lucide-react'

export default function JoinSessionForm() {
  const t = useTranslations('PublicJoin')
  const [pin, setPin] = useState('')
  const [isPending, setIsPending] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault()
    if (pin.length !== 4) return

    setIsPending(true)
    router.push(`/view/${pin}`)
  }

  return (
    <form onSubmit={handleJoin} className="w-full flex flex-col gap-4">
      <div>
        <label htmlFor="pin" className="block text-sm font-medium text-gray-300 mb-1">
          {t('roomPin')}
        </label>
        <input
          id="pin"
          type="text"
          maxLength={4}
          pattern="\d{4}"
          placeholder="0000"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-center text-3xl font-mono tracking-widest text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          required
        />
        {error === 'invalid_pin' && (
          <p className="text-red-500 text-sm mt-2 text-center font-bold">{t('invalidPin')}</p>
        )}
      </div>
      <button
        type="submit"
        disabled={pin.length !== 4 || isPending}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
        {t('joinSession')}
      </button>
    </form>
  )
}
