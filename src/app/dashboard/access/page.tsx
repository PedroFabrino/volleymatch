import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { ShareAccessPanel, getDashboardHostContext } from '@/features/host-delegation'

export default async function AccessPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await getDashboardHostContext(user.id)
  if (ctx.isSubstituteMode) redirect('/dashboard')

  const t = await getTranslations('HostAccess')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold">{t('pageTitle')}</h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm">{t('pageDesc')}</p>
        <ShareAccessPanel activeGrants={ctx.ownedGrants} />
      </div>
    </div>
  )
}
