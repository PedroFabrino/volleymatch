import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { JoinSessionForm } from '@/features/public-join'
import { Trophy } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { Suspense } from 'react'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const t = await getTranslations('Home')
  const tMeta = await getTranslations('Metadata')
  const tLogin = await getTranslations('Login')

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-3xl shadow-2xl p-8 flex flex-col items-center">
        
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-900/50">
          <Trophy className="w-8 h-8 text-white" />
        </div>
        
        <h1 className="text-3xl font-bold text-white mb-2">{tMeta('title')}</h1>
        <p className="text-gray-400 text-center mb-8">
          {t('subtitle')}
        </p>

        <Suspense fallback={<div className="h-24"></div>}>
          <JoinSessionForm />
        </Suspense>

        <div className="w-full relative flex items-center justify-center mt-8 mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-800"></div>
          </div>
          <div className="relative bg-gray-900 px-4 text-sm text-gray-500">
            {tLogin('or')}
          </div>
        </div>

        <Link 
          href="/login"
          className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
        >
          {t('loginAsHost')}
        </Link>

      </div>
    </div>
  )
}
