import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { getSessionSummaryData } from '@/lib/stats'
import { getSessionByIdAdmin } from '@/lib/services'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { ShareHighlightCard } from '@/features/summary'

export default async function PublicShareHighlightPage(props: { params: Promise<{ session_id: string, type: string }> }) {
  const params = await props.params
  const sessionId = params.session_id
  const type = params.type

  if (!['mvp', 'comeback', 'blowout', 'topscorer'].includes(type)) {
    redirect('/')
  }

  const supabase = createAdminClient()
  const { data: session } = await getSessionByIdAdmin(supabase, sessionId)

  if (!session) redirect('/')

  const t = await getTranslations('Summary')
  const summaryData = await getSessionSummaryData(supabase, sessionId)

  const footerDate = new Date(session.created_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm mb-6 flex justify-center">
        <div className="text-white font-black text-2xl tracking-tighter">VolleyMatch</div>
      </div>

      <ShareHighlightCard
        type={type as 'mvp' | 'comeback' | 'blowout' | 'topscorer'}
        footerDate={footerDate}
        {...summaryData}
      />

      <div className="mt-8">
        <Link href="/" className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full font-bold transition">
          {t('createLeague')}
        </Link>
      </div>
    </div>
  )
}
