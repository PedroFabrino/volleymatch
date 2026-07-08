'use client'

import { Trophy, Flame, Swords, X, Share2, Copy, Check } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Match } from '@/types/match'
import { PlayerStat } from '@/types/player'
import HighlightMvpPanel from './HighlightMvpPanel'
import HighlightComebackPanel from './HighlightComebackPanel'
import HighlightBlowoutPanel from './HighlightBlowoutPanel'
import HighlightTopScorerPanel from './HighlightTopScorerPanel'

export type HighlightSelection = 'mvp' | 'comeback' | 'blowout' | 'topscorer'

type Props = {
  selected: HighlightSelection
  onClose: () => void
  onShare: () => void
  copied: boolean
  mvp: PlayerStat | null
  bestPartner: { name: string; wins: number } | null
  biggestComebackMatch: Match | null
  maxComeback: number
  turningPoint: { winningScore: number; losingScore: number }
  biggestDiffMatch: Match | null
  maxDiff: number
  topScorer?: { id: string; name: string; points: number } | null
  getPlayerNames: (teamIds: string[]) => string
}

export default function HighlightDetailModal({
  selected,
  onClose,
  onShare,
  copied,
  mvp,
  bestPartner,
  biggestComebackMatch,
  turningPoint,
  biggestDiffMatch,
  maxDiff,
  topScorer,
  getPlayerNames,
}: Props) {
  const t = useTranslations('Summary')
  const tMeta = useTranslations('Metadata')

  const gradientClass =
    selected === 'mvp'
      ? 'bg-gradient-to-br from-yellow-400 to-amber-600'
      : selected === 'comeback'
        ? 'bg-gradient-to-br from-red-500 to-rose-700'
        : selected === 'topscorer'
          ? 'bg-gradient-to-br from-emerald-500 to-green-700'
          : 'bg-gradient-to-br from-indigo-500 to-blue-700'

  const title =
    selected === 'mvp'
      ? t('mvp')
      : selected === 'comeback'
        ? t('biggestComeback')
        : selected === 'topscorer'
          ? t('topScorer')
          : t('biggestDifference')

  const canNativeShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  const BackgroundIcon =
    selected === 'mvp'
      ? Trophy
      : selected === 'blowout'
        ? Swords
        : Flame

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-sm flex flex-col gap-4 animate-in fade-in zoom-in duration-200 my-auto">
        <div className="flex justify-between items-center px-2">
          <button
            onClick={onClose}
            className="p-2 bg-gray-800 text-gray-300 rounded-full hover:bg-gray-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
          <button
            onClick={onShare}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-full font-bold transition shadow-lg"
          >
            {copied ? (
              <Check className="w-4 h-4" />
            ) : canNativeShare ? (
              <Share2 className="w-4 h-4" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            {copied ? t('copiedLink') : t('share')}
          </button>
        </div>

        <div
          id="share-card"
          className={`relative rounded-3xl p-8 text-white shadow-2xl overflow-hidden flex flex-col justify-between ${gradientClass}`}
        >
          <BackgroundIcon className="absolute -right-10 -bottom-10 w-64 h-64 opacity-20" />

          <div className="relative z-10 flex-1 flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-white/80 font-bold uppercase tracking-widest text-sm">
                {title}
              </h3>
            </div>

            <div className="flex-1 flex flex-col justify-center">
              {selected === 'mvp' && mvp && (
                <HighlightMvpPanel mvp={mvp} bestPartner={bestPartner} />
              )}

              {selected === 'comeback' && biggestComebackMatch && (
                <HighlightComebackPanel
                  biggestComebackMatch={biggestComebackMatch}
                  turningPoint={turningPoint}
                  getPlayerNames={getPlayerNames}
                />
              )}

              {selected === 'blowout' && biggestDiffMatch && (
                <HighlightBlowoutPanel
                  biggestDiffMatch={biggestDiffMatch}
                  maxDiff={maxDiff}
                  getPlayerNames={getPlayerNames}
                />
              )}

              {selected === 'topscorer' && topScorer && (
                <HighlightTopScorerPanel topScorer={topScorer} />
              )}
            </div>

            <div className="mt-8 pt-4 border-t border-white/20 flex justify-between items-end">
              <div className="text-white/60 text-xs font-bold uppercase tracking-wider">
                {new Date().toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
              <div className="text-white/80 font-black text-xl italic tracking-tighter">
                {tMeta('title')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
