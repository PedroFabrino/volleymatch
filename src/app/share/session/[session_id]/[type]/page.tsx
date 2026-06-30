import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { getSessionSummaryData } from '@/utils/summaryStats'
import { Trophy, TrendingUp, Flame, Swords, Calendar } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'

export default async function PublicShareHighlightPage(props: { params: Promise<{ session_id: string, type: string }> }) {
  const params = await props.params
  const sessionId = params.session_id
  const type = params.type

  if (!['mvp', 'comeback', 'blowout'].includes(type)) {
    redirect('/')
  }

  const supabase = await createClient()

  // Fetch Session Info to ensure it exists and get date
  const { data: session } = await supabase
    .from('sessions')
    .select('created_at')
    .eq('id', sessionId)
    .single()

  if (!session) redirect('/')

  const t = await getTranslations('Summary')
  
  const {
    playersData,
    mvp,
    bestPartner,
    maxComeback,
    biggestComebackMatch,
    turningPoint,
    maxDiff,
    biggestDiffMatch
  } = await getSessionSummaryData(supabase, sessionId)

  const getPlayerNames = (teamIds: string[]) => {
    return teamIds.map((id: string) => playersData.find((p: any) => p.id === id)?.name).join(', ')
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      
      <div className="w-full max-w-sm mb-6 flex justify-center">
        <div className="text-white font-black text-2xl tracking-tighter">
          VolleyMatch
        </div>
      </div>

      <div className={`relative w-full max-w-sm rounded-3xl p-8 text-white shadow-2xl overflow-hidden min-h-[500px] flex flex-col justify-between ${
        type === 'mvp' ? 'bg-gradient-to-br from-yellow-400 to-amber-600' : 
        type === 'comeback' ? 'bg-gradient-to-br from-red-500 to-rose-700' :
        'bg-gradient-to-br from-indigo-500 to-blue-700'
      }`}>
        
        {/* Background Icon */}
        {type === 'mvp' && <Trophy className="absolute -right-10 -bottom-10 w-64 h-64 opacity-20" />}
        {type === 'comeback' && <Flame className="absolute -right-10 -bottom-10 w-64 h-64 opacity-20" />}
        {type === 'blowout' && <Swords className="absolute -right-10 -bottom-10 w-64 h-64 opacity-20" />}

        {/* Card Content */}
        <div className="relative z-10 flex flex-col h-full">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-white/80 font-bold uppercase tracking-widest text-sm">
              {type === 'mvp' ? t('mvp') : type === 'comeback' ? t('biggestComeback') : t('biggestDifference')}
            </h3>
          </div>

          {/* Body */}
          <div className="flex-1 flex flex-col justify-center">
            
            {/* MVP Specifics */}
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

            {/* Comeback Specifics */}
            {type === 'comeback' && biggestComebackMatch && (
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
            {type === 'blowout' && biggestDiffMatch && (
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
              {new Date(session.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            <div className="text-white/80 font-black text-xl italic tracking-tighter">
              VolleyMatch
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <Link href="/" className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full font-bold transition">
          Create Your Own League
        </Link>
      </div>

    </div>
  )
}
