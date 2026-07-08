import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ActiveSessionBanner from '@/components/layout/ActiveSessionBanner'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <>
      <ActiveSessionBanner />
      {children}
    </>
  )
}
