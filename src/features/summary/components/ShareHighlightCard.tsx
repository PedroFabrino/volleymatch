import { Trophy, TrendingUp, Flame, Swords } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

type HighlightType = 'mvp' | 'comeback' | 'blowout' | 'topscorer'

type ShareHighlightCardProps = {
  type: HighlightType
  footerDate: string
  playersData: { id: string; name: string }[]
  mvp?: { name: string; mmrChange: number } | null
  bestPartner?: { name: string; wins: number } | null
  maxComeback?: number
  biggestComebackMatch?: {
    team_a_score: number
    team_b_score: number
    team_a_players: string[]
    team_b_players: string[]
  } | null
  turningPoint?: { losingScore: number; winningScore: number }
  maxDiff?: number
  biggestDiffMatch?: {
    team_a_score: number
    team_b_score: number
    team_a_players: string[]
    team_b_players: string[]
  } | null
  topScorer?: { name: string; points: number } | null
}

export default async function ShareHighlightCard({
  type,
  footerDate,
  playersData,
  mvp,
  bestPartner,
  biggestComebackMatch,
  turningPoint,
  maxDiff,
  biggestDiffMatch,
  topScorer,
}: ShareHighlightCardProps) {
  const t = await getTranslations('Summary')

  const getPlayerNames = (teamIds: string[]) => {
    return teamIds
      .map(id => playersData.find(p => p.id === id)?.name)
      .join(', ')
  }

  const gradientClass =
    type === 'mvp'
      ? 'bg-gradient-to-br from-yellow-400 to-amber-600'
      : type === 'comeback'
        ? 'bg-gradient-to-br from-red-500 to-rose-700'
        : type === 'topscorer'
          ? 'bg-gradient-to-br from-emerald-500 to-green-700'
          : 'bg-gradient-to-br from-indigo-500 to-blue-700'

  return (
    <div className={`relative w-full max-w-sm rounded-3xl p-8 text-white shadow-2xl overflow-hidden flex flex-col justify-between ${gradientClass}`}>
      {type === 'mvp' && <Trophy className="absolute -right-10 -bottom-10 w-64 h-64 opacity-20" />}
      {type === 'comeback' && <Flame className="absolute -right-10 -bottom-10 w-64 h-64 opacity-20" />}
      {type === 'blowout' && <Swords className="absolute -right-10 -bottom-10 w-64 h-64 opacity-20" />}
      {type === 'topscorer' && <Flame className="absolute -right-10 -bottom-10 w-64 h-64 opacity-20" />}

      <div className="relative z-10 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-6">
          <h3 className="text-white/80 font-bold uppercase tracking-widest text-sm">
            {type === 'mvp'
              ? t('mvp')
              : type === 'comeback'
                ? t('biggestComeback')
                : type === 'topscorer'
                  ? t('topScorer')
                  : t('biggestDifference')}
          </h3>
        </div>

        <div className="flex-1 flex flex-col justify-center">
          {type === 'mvp' && mvp && (
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

          {type === 'comeback' && biggestComebackMatch && turningPoint && (
            <>
              <div className="text-white/90 font-bold text-xl mb-1">
                {t('down', { losing: turningPoint.losingScore, winning: turningPoint.winningScore })}
              </div>
              <div className="text-5xl font-black mb-8 leading-tight">
                {t('ralliedToWin', {
                  scoreA: Math.max(biggestComebackMatch.team_a_score, biggestComebackMatch.team_b_score),
                  scoreB: Math.min(biggestComebackMatch.team_a_score, biggestComebackMatch.team_b_score),
                })}
              </div>
              <div className="bg-red-900/30 rounded-2xl p-4 border border-red-500/30 backdrop-blur-md">
                <div className="text-xs text-red-200 uppercase font-bold tracking-widest mb-1">{t('comebackKids')}</div>
                <div className="font-bold text-lg leading-snug">
                  {getPlayerNames(
                    biggestComebackMatch.team_a_score > biggestComebackMatch.team_b_score
                      ? biggestComebackMatch.team_a_players
                      : biggestComebackMatch.team_b_players
                  )}
                </div>
              </div>
            </>
          )}

          {type === 'blowout' && biggestDiffMatch && maxDiff !== undefined && (
            <>
              <div className="text-white/90 font-bold text-xl mb-1">{t('totalDominance')}</div>
              <div className="text-5xl font-black mb-8 leading-tight">
                {t('wonBy', { diff: maxDiff })}
              </div>
              <div className="bg-indigo-900/30 rounded-2xl p-4 border border-indigo-500/30 backdrop-blur-md">
                <div className="text-xs text-indigo-200 uppercase font-bold tracking-widest mb-1">{t('unstoppables')}</div>
                <div className="font-bold text-lg leading-snug">
                  {getPlayerNames(
                    biggestDiffMatch.team_a_score > biggestDiffMatch.team_b_score
                      ? biggestDiffMatch.team_a_players
                      : biggestDiffMatch.team_b_players
                  )}
                </div>
              </div>
            </>
          )}

          {type === 'topscorer' && topScorer && (
            <>
              <div className="text-white/90 font-bold text-xl mb-1">{t('offensiveMachine')}</div>
              <div className="text-5xl font-black mb-8 leading-tight">{topScorer.name}</div>
              <div className="bg-green-900/30 rounded-2xl p-4 border border-green-500/30 backdrop-blur-md">
                <div className="text-xs text-emerald-200 uppercase font-bold tracking-widest mb-1">{t('pointsScored')}</div>
                <div className="font-bold text-lg leading-snug">
                  {topScorer.points} {t('points', { count: topScorer.points })}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="mt-8 pt-4 border-t border-white/20 flex justify-between items-end">
          <div className="text-white/60 text-xs font-bold uppercase tracking-wider">{footerDate}</div>
          <div className="text-white/80 font-black text-xl italic tracking-tighter">
            VolleyMatch
          </div>
        </div>
      </div>
    </div>
  )
}
