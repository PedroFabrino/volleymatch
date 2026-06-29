import { login, signup } from './actions'
import { getTranslations } from 'next-intl/server'

export default async function LoginPage(props: { searchParams: Promise<{ error: string }> }) {
  const searchParams = await props.searchParams
  const t = await getTranslations('Login')

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50 p-4">
      <form className="flex w-full max-w-sm flex-col gap-5 rounded-2xl bg-white p-8 shadow-xl">
        <div className="text-center">
          <h1 className="text-3xl font-black tracking-tight text-blue-600 mb-1">VolleyMatch</h1>
          <p className="text-sm text-gray-500">{t('hosterLogin')}</p>
        </div>
        
        {searchParams?.error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm text-center">
            {searchParams.error}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-semibold text-gray-700">{t('emailAddress')}</label>
          <input 
            id="email" 
            name="email" 
            type="email" 
            placeholder="hoster@example.com"
            required 
            className="rounded-lg border border-gray-300 p-3 text-black focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-semibold text-gray-700">{t('password')}</label>
          <input 
            id="password" 
            name="password" 
            type="password" 
            placeholder="••••••••"
            required 
            className="rounded-lg border border-gray-300 p-3 text-black focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="mt-2 flex flex-col gap-3">
          <button formAction={login} className="rounded-lg bg-blue-600 py-3 text-white font-bold hover:bg-blue-700 transition-colors">
            {t('logIn')}
          </button>
          <div className="relative flex items-center justify-center py-2">
            <div className="border-t w-full border-gray-200"></div>
            <span className="absolute bg-white px-2 text-xs text-gray-400 font-medium uppercase">{t('or')}</span>
          </div>
          <button formAction={signup} className="rounded-lg bg-gray-100 py-3 text-gray-800 font-bold hover:bg-gray-200 transition-colors">
            {t('createAccount')}
          </button>
        </div>
      </form>
    </div>
  )
}
