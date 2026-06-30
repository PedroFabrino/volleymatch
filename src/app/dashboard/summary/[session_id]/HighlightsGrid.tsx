'use client'

import { useState } from 'react'
import { Trophy, TrendingUp, Flame, Swords, X, Share2, Copy, Check } from 'lucide-react'
import { useTranslations } from 'next-intl'

type Props = {
  sessionId: string;
  mvp: any;
  bestPartner: { name: string, wins: number } | null;
  biggestComebackMatch: any;
  maxComeback: number;
  turningPoint: { winningScore: number, losingScore: number };
  biggestDiffMatch: any;
  maxDiff: number;
  playersData: any[];
}

export default function HighlightsGrid({ 
  sessionId, mvp, bestPartner, biggestComebackMatch, maxComeback, turningPoint, biggestDiffMatch, maxDiff, playersData 
}: Props) {
  const t = useTranslations('Summary')
  const [selected, setSelected] = useState<'mvp' | 'comeback' | 'blowout' | null>(null)
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    const url = `${window.location.origin}/share/session/${sessionId}/${selected}`
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: t('highlightTitle'),
          url: url
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
    return teamIds.map((id: string) => playersData.find((p: any) => p.id === id)?.name).join(', ')
  }

  return (
    <>
      {/* Compact Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        
        {/* MVP Compact */}
        <button 
          onClick={() => mvp && setSelected('mvp')}
          className={`bg-gradient-to-br from-yellow-400 to-amber-600 rounded-3xl p-6 text-white shadow-xl shadow-amber-900/20 relative overflow-hidden text-left transition hover:scale-105 ${!mvp ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Trophy className="absolute -right-4 -bottom-4 w-32 h-32 opacity-20" />
          <div className="relative z-10">
            <h3 className="text-amber-100 font-bold uppercase tracking-wider text-sm mb-4">{t('mvp')}</h3>
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
          </div>
        </button>

        {/* Comeback Compact */}
        <button 
          onClick={() => biggestComebackMatch && maxComeback > 0 && setSelected('comeback')}
          className={`bg-gradient-to-br from-red-500 to-rose-700 rounded-3xl p-6 text-white shadow-xl shadow-red-900/20 relative overflow-hidden text-left transition hover:scale-105 ${!(biggestComebackMatch && maxComeback > 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Flame className="absolute -right-4 -bottom-4 w-32 h-32 opacity-20" />
          <div className="relative z-10">
            <h3 className="text-red-200 font-bold uppercase tracking-wider text-sm mb-4">{t('biggestComeback')}</h3>
            {biggestComebackMatch && maxComeback > 0 ? (
              <>
                <div className="text-3xl font-black mb-1">{maxComeback} pts</div>
                <div className="text-red-200 font-bold">
                  {Math.max(biggestComebackMatch.team_a_score, biggestComebackMatch.team_b_score)} - {Math.min(biggestComebackMatch.team_a_score, biggestComebackMatch.team_b_score)}
                </div>
              </>
            ) : (
              <div className="text-xl font-bold">{t('noComebacks')}</div>
            )}
          </div>
        </button>

        {/* Blowout Compact */}
        <button 
          onClick={() => biggestDiffMatch && maxDiff > 0 && setSelected('blowout')}
          className={`bg-gradient-to-br from-indigo-500 to-blue-700 rounded-3xl p-6 text-white shadow-xl shadow-indigo-900/20 relative overflow-hidden text-left transition hover:scale-105 ${!(biggestDiffMatch && maxDiff > 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Swords className="absolute -right-4 -bottom-4 w-32 h-32 opacity-20" />
          <div className="relative z-10">
            <h3 className="text-indigo-200 font-bold uppercase tracking-wider text-sm mb-4">{t('biggestDifference')}</h3>
            {biggestDiffMatch && maxDiff > 0 ? (
              <>
                <div className="text-3xl font-black mb-1">+{maxDiff} pts</div>
                <div className="text-indigo-200 font-bold">
                  {Math.max(biggestDiffMatch.team_a_score, biggestDiffMatch.team_b_score)} - {Math.min(biggestDiffMatch.team_a_score, biggestDiffMatch.team_b_score)}
                </div>
              </>
            ) : (
              <div className="text-xl font-bold">{t('noData')}</div>
            )}
          </div>
        </button>

      </div>

      {/* Share Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-sm flex flex-col gap-4 animate-in fade-in zoom-in duration-200 my-auto">
            
            {/* Modal Header Actions */}
            <div className="flex justify-between items-center px-2">
              <button onClick={() => setSelected(null)} className="p-2 bg-gray-800 text-gray-300 rounded-full hover:bg-gray-700 transition">
                <X className="w-5 h-5" />
              </button>
              <button onClick={handleShare} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-full font-bold transition shadow-lg">
                {copied ? <Check className="w-4 h-4" /> : (typeof navigator !== 'undefined' && typeof navigator.share === 'function' ? <Share2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />)}
                {copied ? t('copiedLink') : t('share')}
              </button>
            </div>

            <div id="share-card" className={`relative rounded-3xl p-8 text-white shadow-2xl overflow-hidden flex flex-col justify-between ${
              selected === 'mvp' ? 'bg-gradient-to-br from-yellow-400 to-amber-600' : 
              selected === 'comeback' ? 'bg-gradient-to-br from-red-500 to-rose-700' :
              'bg-gradient-to-br from-indigo-500 to-blue-700'
            }`}>
              
              {/* Background Icon */}
              {selected === 'mvp' && <Trophy className="absolute -right-10 -bottom-10 w-64 h-64 opacity-20" />}
              {selected === 'comeback' && <Flame className="absolute -right-10 -bottom-10 w-64 h-64 opacity-20" />}
              {selected === 'blowout' && <Swords className="absolute -right-10 -bottom-10 w-64 h-64 opacity-20" />}

              {/* Card Content */}
              <div className="relative z-10 flex-1 flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-white/80 font-bold uppercase tracking-widest text-sm">
                    {selected === 'mvp' ? t('mvp') : selected === 'comeback' ? t('biggestComeback') : t('biggestDifference')}
                  </h3>
                </div>

                {/* Body */}
                <div className="flex-1 flex flex-col justify-center">
                  
                  {/* MVP Specifics */}
                  {selected === 'mvp' && mvp && (
                    <>
                      <div className="text-5xl font-black mb-2 leading-tight">{mvp.name}</div>
                      <div className="text-amber-100 flex items-center gap-2 font-black text-2xl mb-8">
                        <TrendingUp className="w-8 h-8" /> 
                        +{mvp.mmrChange} MMR
                      </div>
                      {bestPartner && (
                        <div className="bg-amber-900/30 rounded-2xl p-4 border border-amber-500/30 backdrop-blur-md">
                          <div className="text-xs text-amber-200 uppercase font-bold tracking-widest mb-1">{t('dynamicDuo')}</div>
                          <div className="font-bold flex items-center justify-between text-lg">
                            <span>{bestPartner.name}</span>
                            <span className="text-amber-200">{t('winsTogether', { count: bestPartner.wins })}</span>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Comeback Specifics */}
                  {selected === 'comeback' && biggestComebackMatch && (
                    <>
                      <div className="text-white/90 font-bold text-xl mb-1">
                        {t('down', { losing: turningPoint.losingScore, winning: turningPoint.winningScore })}
                      </div>
                      <div className="text-5xl font-black mb-8 leading-tight">
                        {t('ralliedToWin', { scoreA: Math.max(biggestComebackMatch.team_a_score, biggestComebackMatch.team_b_score), scoreB: Math.min(biggestComebackMatch.team_a_score, biggestComebackMatch.team_b_score) })}
                      </div>
                      <div className="bg-red-900/30 rounded-2xl p-4 border border-red-500/30 backdrop-blur-md">
                        <div className="text-xs text-red-200 uppercase font-bold tracking-widest mb-1">{t('comebackKids')}</div>
                        <div className="font-bold text-lg leading-snug">
                          {getPlayerNames(biggestComebackMatch.team_a_score > biggestComebackMatch.team_b_score ? biggestComebackMatch.team_a_players : biggestComebackMatch.team_b_players)}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Blowout Specifics */}
                  {selected === 'blowout' && biggestDiffMatch && (
                    <>
                      <div className="text-white/90 font-bold text-xl mb-1">{t('totalDominance')}</div>
                      <div className="text-5xl font-black mb-8 leading-tight">
                        {t('wonBy', { diff: maxDiff })}
                      </div>
                      <div className="bg-indigo-900/30 rounded-2xl p-4 border border-indigo-500/30 backdrop-blur-md">
                        <div className="text-xs text-indigo-200 uppercase font-bold tracking-widest mb-1">{t('unstoppables')}</div>
                        <div className="font-bold text-lg leading-snug">
                          {getPlayerNames(biggestDiffMatch.team_a_score > biggestDiffMatch.team_b_score ? biggestDiffMatch.team_a_players : biggestDiffMatch.team_b_players)}
                        </div>
                      </div>
                    </>
                  )}

                </div>

                {/* Footer Watermark */}
                <div className="mt-8 pt-4 border-t border-white/20 flex justify-between items-end">
                  <div className="text-white/60 text-xs font-bold uppercase tracking-wider">
                    {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <div className="text-white/80 font-black text-xl italic tracking-tighter">
                    VolleyMatch
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  )
}
