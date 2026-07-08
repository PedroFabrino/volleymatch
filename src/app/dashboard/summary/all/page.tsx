import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, History } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { HighlightsGrid, SummaryLeaderboard } from '@/features/summary'
import { getGlobalSummaryData } from '@/lib/stats'

export default async function GlobalSummaryPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const t = await getTranslations('Dashboard')
  const ts = await getTranslations('Summary')

  const {
    playersData,
    leaderboard,
    mvp,
    mostGamesPlayed,
    bestPartner,
    bestPartnerId,
    maxComeback,
    biggestComebackMatch,
    turningPoint,
    maxDiff,
    biggestDiffMatch,
    topScorer
  } = await getGlobalSummaryData(supabase, user.id)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col transition-colors p-4 md:p-8">
      <div className="mx-auto max-w-5xl w-full">
        
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="p-3 bg-white dark:bg-gray-900 rounded-full shadow hover:bg-gray-100 dark:hover:bg-gray-800 transition">
              <ArrowLeft className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            </Link>
            <div>
              <h1 className="text-4xl font-black text-gray-900 dark:text-gray-100 flex items-center gap-3">
                <History className="w-8 h-8 text-indigo-500" /> 
                {t('globalSummary')}
              </h1>
              <div className="text-gray-500 dark:text-gray-400 mt-1">
                {t('globalSummaryDesc')}
              </div>
            </div>
          </div>
          <Link href="/dashboard" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition shadow-lg shadow-indigo-900/20">
            {ts('backHome')}
          </Link>
        </div>

        <HighlightsGrid 
          sessionId="all"
          mvp={mvp}
          bestPartner={bestPartner}
          biggestComebackMatch={biggestComebackMatch}
          maxComeback={maxComeback}
          turningPoint={turningPoint}
          biggestDiffMatch={biggestDiffMatch}
          maxDiff={maxDiff}
          playersData={playersData}
          topScorer={topScorer}
          isGlobal={true}
          hosterId={user.id}
        />

        <SummaryLeaderboard
          leaderboard={leaderboard}
          mvp={mvp}
          bestPartnerId={bestPartnerId}
          biggestComebackMatch={biggestComebackMatch}
          maxComeback={maxComeback}
          biggestDiffMatch={biggestDiffMatch}
          maxDiff={maxDiff}
          mostGamesPlayed={mostGamesPlayed}
        />

      </div>
    </div>
  )
}
