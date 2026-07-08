import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { getPlayersByHoster } from '@/lib/services'
import { PlayerForm, PlayerList } from '@/features/roster'
import { PlayerPosition } from '@/types/player'

export default async function RosterPage(props: { searchParams: Promise<{ error?: string, edit?: string }> }) {
  const searchParams = await props.searchParams
  const editId = searchParams?.edit
  
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const t = await getTranslations('Roster')

  if (!user) {
    redirect('/login')
  }

  // Fetch all players for this hoster
  const players = await getPlayersByHoster(supabase, user.id)

  const availablePositions: PlayerPosition[] = [
    'Setter', 'Outside Hitter', 'Middle Blocker', 'Libero', 'Opposite Hitter'
  ]

  const editingPlayer = editId ? players?.find(p => p.id === editId) : null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col transition-colors">
      <div className="flex-1 p-4 md:p-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 flex items-center gap-4">
            <Link href="/dashboard" className="p-2 bg-white dark:bg-gray-900 rounded-full shadow hover:bg-gray-100 dark:hover:bg-gray-800 transition">
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('title')}</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <PlayerForm editingPlayer={editingPlayer} availablePositions={availablePositions} searchParamsError={searchParams?.error} />
            </div>

            <div className="lg:col-span-2">
              <PlayerList players={players ?? []} />
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
