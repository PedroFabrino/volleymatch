import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { HighlightsGrid, SummaryLeaderboard, SummaryPageHeader } from '@/features/summary'
import { getSessionSummaryData } from '@/lib/stats'
import { storeSummaryData, getSessionById } from '@/lib/services'

type SummaryData = Awaited<ReturnType<typeof getSessionSummaryData>>

export default async function SessionSummaryPage(props: { params: Promise<{ session_id: string }> }) {
  const params = await props.params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

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
        <SummaryPageHeader sessionId={sessionId} createdAt={session.created_at} />

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
