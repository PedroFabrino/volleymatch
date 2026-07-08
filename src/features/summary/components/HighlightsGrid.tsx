'use client'

import { useState } from 'react'
import { Trophy, TrendingUp, Flame, Swords } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Match } from '@/types/match'
import { PlayerStat } from '@/types/player'
import HighlightCard from './HighlightCard'
import HighlightDetailModal, { type HighlightSelection } from './HighlightDetailModal'

type Props = {
  sessionId: string
  mvp: PlayerStat | null
  bestPartner: { name: string; wins: number } | null
  biggestComebackMatch: Match | null
  maxComeback: number
  turningPoint: { winningScore: number; losingScore: number }
  biggestDiffMatch: Match | null
  maxDiff: number
  playersData: { id: string; name: string }[]
  topScorer?: { id: string; name: string; points: number } | null
  isGlobal?: boolean
  hosterId?: string
}

export default function HighlightsGrid({
  sessionId,
  mvp,
  bestPartner,
  biggestComebackMatch,
  maxComeback,
  turningPoint,
  biggestDiffMatch,
  maxDiff,
  playersData,
  topScorer,
  isGlobal,
  hosterId,
}: Props) {
  const t = useTranslations('Summary')
  const [selected, setSelected] = useState<HighlightSelection | null>(null)
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    const url =
      isGlobal && hosterId
        ? `${window.location.origin}/share/hoster/${hosterId}/${selected}`
        : `${window.location.origin}/share/session/${sessionId}/${selected}`

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: t('highlightTitle'),
          url,
        })
      } catch (err) {
        console.error('Error sharing', err)
      }
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const getPlayerNames = (teamIds: string[]) => {
    return teamIds.map(id => playersData.find(p => p.id === id)?.name).join(', ')
  }

  const hasComeback = !!(biggestComebackMatch && maxComeback > 0)
  const hasBlowout = !!(biggestDiffMatch && maxDiff > 0)

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <HighlightCard
          title={t('mvp')}
          disabled={!mvp}
          gradient="bg-gradient-to-br from-yellow-400 to-amber-600"
          shadow="shadow-xl shadow-amber-900/20"
          icon={Trophy}
          onClick={() => mvp && setSelected('mvp')}
        >
          {mvp ? (
            <>
              <div className="text-3xl font-black mb-1">{mvp.name}</div>
              <div className="text-amber-100 flex items-center gap-2 font-bold text-lg">
                <TrendingUp className="w-5 h-5" />
                +{mvp.mmrChange} MMR
              </div>
            </>
          ) : (
            <div className="text-xl font-bold">{t('noData')}</div>
          )}
        </HighlightCard>

        <HighlightCard
          title={t('biggestComeback')}
          disabled={!hasComeback}
          gradient="bg-gradient-to-br from-red-500 to-rose-700"
          shadow="shadow-xl shadow-red-900/20"
          icon={Flame}
          onClick={() => hasComeback && setSelected('comeback')}
        >
          {hasComeback && biggestComebackMatch ? (
            <>
              <div className="text-3xl font-black mb-1">{maxComeback} pts</div>
              <div className="text-red-200 font-bold">
                {Math.max(biggestComebackMatch.team_a_score, biggestComebackMatch.team_b_score)} -{' '}
                {Math.min(biggestComebackMatch.team_a_score, biggestComebackMatch.team_b_score)}
              </div>
            </>
          ) : (
            <div className="text-xl font-bold">{t('noComebacks')}</div>
          )}
        </HighlightCard>

        <HighlightCard
          title={t('biggestDifference')}
          disabled={!hasBlowout}
          gradient="bg-gradient-to-br from-indigo-500 to-blue-700"
          shadow="shadow-xl shadow-indigo-900/20"
          icon={Swords}
          onClick={() => hasBlowout && setSelected('blowout')}
        >
          {hasBlowout && biggestDiffMatch ? (
            <>
              <div className="text-3xl font-black mb-1">+{maxDiff} pts</div>
              <div className="text-indigo-200 font-bold">
                {Math.max(biggestDiffMatch.team_a_score, biggestDiffMatch.team_b_score)} -{' '}
                {Math.min(biggestDiffMatch.team_a_score, biggestDiffMatch.team_b_score)}
              </div>
            </>
          ) : (
            <div className="text-xl font-bold">{t('noData')}</div>
          )}
        </HighlightCard>

        {topScorer && (
          <HighlightCard
            title={t('topScorer')}
            gradient="bg-gradient-to-br from-emerald-500 to-green-700"
            shadow="shadow-xl shadow-green-900/20"
            icon={Flame}
            onClick={() => setSelected('topscorer')}
          >
            <div className="text-3xl font-black mb-1">{topScorer.name}</div>
            <div className="text-emerald-200 font-bold">
              {topScorer.points} {t('points', { count: topScorer.points })}
            </div>
          </HighlightCard>
        )}
      </div>

      {selected && (
        <HighlightDetailModal
          selected={selected}
          onClose={() => setSelected(null)}
          onShare={handleShare}
          copied={copied}
          mvp={mvp}
          bestPartner={bestPartner}
          biggestComebackMatch={biggestComebackMatch}
          maxComeback={maxComeback}
          turningPoint={turningPoint}
          biggestDiffMatch={biggestDiffMatch}
          maxDiff={maxDiff}
          topScorer={topScorer}
          getPlayerNames={getPlayerNames}
        />
      )}
    </>
  )
}
