import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { HighlightsGrid, ShareButton, SummaryLeaderboard } from '@/features/summary'
import { getSessionSummaryData } from '@/lib/stats'
import { storeSummaryData, getSessionById } from '@/lib/services'

type SummaryData = Awaited<ReturnType<typeof getSessionSummaryData>>

export default async function SessionSummaryPage(props: { params: Promise<{ session_id: string }> }) {
  const params = await props.params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const t = await getTranslations('Summary')
  const sessionId = params.session_id

  const session = await getSessionById(supabase, sessionId, user.id)

  if (!session) redirect('/dashboard')

  let summaryData: SummaryData

  if (!session.summary_data) {
    summaryData = await getSessionSummaryData(supabase, sessionId)
    await storeSummaryData(supabase, sessionId, summaryData)
  } else {
    summaryData = session.summary_data as SummaryData
  }

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
    topScorer,
  } = summaryData

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col transition-colors p-4 md:p-8">
      <div className="mx-auto max-w-5xl w-full">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="p-3 bg-white dark:bg-gray-900 rounded-full shadow hover:bg-gray-100 dark:hover:bg-gray-800 transition">
              <ArrowLeft className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            </Link>
            <div>
              <h1 className="text-4xl font-black text-gray-900 dark:text-gray-100">{t('title')}</h1>
              <div className="text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-1">
                <Calendar className="w-4 h-4" />
                {new Date(session.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ShareButton sessionId={sessionId} />
            <Link href="/dashboard" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition shadow-lg shadow-blue-900/20 hidden sm:flex">
              {t('backHome')}
            </Link>
          </div>
        </div>

        <HighlightsGrid
          sessionId={sessionId}
          mvp={mvp}
          bestPartner={bestPartner}
          biggestComebackMatch={biggestComebackMatch}
          maxComeback={maxComeback}
          turningPoint={turningPoint}
          biggestDiffMatch={biggestDiffMatch}
          maxDiff={maxDiff}
          playersData={playersData}
          topScorer={topScorer}
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
