'use client'

import { useState, useEffect } from 'react'
import { QrCode, X } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useTranslations } from 'next-intl'

export function QrCodeModal({ pin }: { pin: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [url, setUrl] = useState('')
  const t = useTranslations('QrCode')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUrl(`${window.location.origin}/join/${pin}`)
    }
  }, [pin])

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm font-sans font-bold shadow-sm"
      >
        <QrCode className="w-4 h-4" />
        {t('buttonLabel')}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 max-w-sm w-full relative shadow-2xl flex flex-col items-center">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-800 transition"
            >
              <X className="w-6 h-6" />
            </button>

            <h2 className="text-2xl font-black mb-2 text-white">{t('title')}</h2>
            <p className="text-gray-400 mb-8 text-center text-sm font-sans">
              {t('scanDescription')}
            </p>

            <div className="bg-white p-4 rounded-2xl mb-8">
              {url && (
                <QRCodeSVG
                  value={url}
                  size={240}
                  bgColor={'#ffffff'}
                  fgColor={'#000000'}
                  level={'Q'}
                  imageSettings={{
                    src: '/icon.png',
                    x: undefined,
                    y: undefined,
                    height: 48,
                    width: 48,
                    excavate: true,
                  }}
                />
              )}
            </div>

            <div className="text-center font-mono">
              <span className="text-gray-500 text-sm">{t('roomPin')}</span>
              <div className="text-4xl font-black text-blue-500 tracking-widest">{pin}</div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
