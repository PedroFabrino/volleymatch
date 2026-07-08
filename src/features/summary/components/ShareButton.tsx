'use client'

import { useState } from 'react'
import { Share2, Download, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'

export default function ShareButton({ sessionId }: { sessionId: string }) {
  const t = useTranslations('Summary')
  const [isSharing, setIsSharing] = useState(false)

  const handleShare = async () => {
    try {
      setIsSharing(true)
      const response = await fetch(`/api/og/summary?session_id=${sessionId}`)
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Failed to fetch image')
      }
      const blob = await response.blob()
      
      const file = new File([blob], 'game-day-recap.png', { type: 'image/png' })
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: t('shareTitle'),
          text: t('shareText'),
          files: [file]
        })
      } else {
        // Fallback to download
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'game-day-recap.png'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error sharing image:', error)
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <button 
      onClick={handleShare} 
      disabled={isSharing}
      className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition shadow-lg shadow-indigo-900/20 disabled:opacity-70"
    >
      {isSharing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Share2 className="w-5 h-5" />}
      {t('shareRecap')}
    </button>
  )
}
