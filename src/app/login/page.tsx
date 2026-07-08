import { login, signup } from './actions'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { ArrowLeft, Trophy } from 'lucide-react'

export default async function LoginPage(props: { searchParams: Promise<{ error: string }> }) {
  const searchParams = await props.searchParams
  const t = await getTranslations('Login')
  const tMeta = await getTranslations('Metadata')

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gray-950 p-4 relative">
      <Link href="/" className="absolute top-6 left-6 text-gray-400 hover:text-white flex items-center gap-2 transition-colors">
        <ArrowLeft className="w-5 h-5" />
        <span className="font-medium">{t('back')}</span>
      </Link>

      <form className="flex w-full max-w-sm flex-col gap-6 rounded-3xl bg-gray-900 border border-gray-800 p-8 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-900/50">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white mb-2">{tMeta('title')}</h1>
          <p className="text-sm text-gray-400">{t('hosterLogin')}</p>
        </div>
        
        {searchParams?.error && (
          <div className="bg-red-950 border border-red-900 text-red-400 p-3 rounded-lg text-sm text-center">
            {searchParams.error}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-sm font-semibold text-gray-300">{t('emailAddress')}</label>
          <input 
            id="email" 
            name="email" 
            type="email" 
            placeholder="hoster@example.com"
            required 
            className="rounded-xl border border-gray-700 bg-gray-950 p-3 text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
          />
        </div>
        
        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="text-sm font-semibold text-gray-300">{t('password')}</label>
          <input 
            id="password" 
            name="password" 
            type="password" 
            placeholder="••••••••"
            required 
            className="rounded-xl border border-gray-700 bg-gray-950 p-3 text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
          />
        </div>

        <div className="mt-2 flex flex-col gap-3">
          <button formAction={login} className="rounded-xl bg-blue-600 py-3.5 text-white font-bold hover:bg-blue-500 transition-colors shadow-lg">
            {t('logIn')}
          </button>
          
          <div className="w-full relative flex items-center justify-center my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-800"></div>
            </div>
            <div className="relative bg-gray-900 px-4 text-xs font-medium uppercase text-gray-500">
              {t('or')}
            </div>
          </div>
          
          <button formAction={signup} className="rounded-xl bg-gray-800 py-3 text-gray-300 font-bold border border-gray-700 hover:bg-gray-700 hover:text-white transition-colors">
            {t('createAccount')}
          </button>
        </div>
      </form>
    </div>
  )
}
