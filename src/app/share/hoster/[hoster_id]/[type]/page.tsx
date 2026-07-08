import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { getGlobalSummaryData } from '@/lib/stats'
import { getPlayerCount } from '@/lib/services'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { ShareHighlightCard } from '@/features/summary'

export default async function PublicShareGlobalHighlightPage(props: { params: Promise<{ hoster_id: string, type: string }> }) {
  const params = await props.params
  const hosterId = params.hoster_id
  const type = params.type

  if (!['mvp', 'comeback', 'blowout', 'topscorer'].includes(type)) {
    redirect('/')
  }

  const supabase = createAdminClient()
  const count = await getPlayerCount(supabase, hosterId)

  if (count === 0) redirect('/')

  const t = await getTranslations('Summary')
  const tMeta = await getTranslations('Metadata')

  const summaryData = await getGlobalSummaryData(supabase, hosterId)

  const footerDate = `${t('allTime')} • ${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm mb-6 flex justify-center">
        <div className="text-white font-black text-2xl tracking-tighter">{tMeta('title')}</div>
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
