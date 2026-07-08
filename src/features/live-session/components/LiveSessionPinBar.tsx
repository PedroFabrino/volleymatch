'use client'

import { useTranslations } from 'next-intl'
import { QrCodeModal } from '@/components/ui/QrCodeModal'

export function LiveSessionPinBar({ pin }: { pin: string }) {
  const t = useTranslations('PublicJoin')

  return (
    <div className="bg-gray-800 p-2 text-center text-sm text-gray-400 font-mono flex items-center justify-center">
      <span>
        {t('roomPin')}: <span className="text-blue-400 font-bold text-lg">{pin}</span>
      </span>
      <QrCodeModal pin={pin} />
    </div>
  )
}
