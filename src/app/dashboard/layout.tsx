import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  getDashboardHostContext,
  HostContextSwitcher,
  SubstituteBanner,
  SmartLoginPrompt,
  linkPendingGrantsOnLogin,
} from '@/features/host-delegation'
import ActiveSessionBanner from '@/components/layout/ActiveSessionBanner'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  await linkPendingGrantsOnLogin()

  const ctx = await getDashboardHostContext(user.id)
  const ownerLabel = ctx.hostContext?.ownerHosterId.slice(0, 8) ?? 'Host'
  const activeGrant = ctx.incomingGrants.find(
    (g) => g.owner_hoster_id === ctx.effectiveHosterId
  )

  const { data: ownActiveSession } = await supabase
    .from('sessions')
    .select('id')
    .eq('hoster_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  return (
    <>
      {ctx.isSubstituteMode && (
        <SubstituteBanner
          ownerLabel={ownerLabel}
          permissions={ctx.permissions}
          expiresAt={activeGrant?.expires_at ?? null}
        />
      )}
      <div className="bg-gray-100 dark:bg-gray-950 border-b dark:border-gray-800 px-4 py-2 flex justify-between items-center">
        <HostContextSwitcher
          userId={user.id}
          effectiveHosterId={ctx.effectiveHosterId}
          isSubstituteMode={ctx.isSubstituteMode}
          incomingGrants={ctx.incomingGrants}
        />
      </div>
      <ActiveSessionBanner effectiveHosterId={ctx.effectiveHosterId} />
      <SmartLoginPrompt
        grants={ctx.incomingGrants}
        hasOwnActiveSession={!!ownActiveSession}
      />
      {children}
    </>
  )
}
