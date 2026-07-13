import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { acceptGrantInvite } from '@/features/host-delegation'

export default async function AcceptDelegationPage(props: {
  searchParams: Promise<{ grant?: string }>
}) {
  const searchParams = await props.searchParams
  const grantId = searchParams.grant

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=/dashboard/delegation/accept${grantId ? `?grant=${grantId}` : ''}`)
  }

  if (!grantId) redirect('/dashboard')

  await acceptGrantInvite(grantId)
  redirect('/dashboard/session')
}
