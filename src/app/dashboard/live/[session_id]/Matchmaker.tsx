'use client'

import { useTransition } from 'react'
import { generateMatch } from './actions'
import { Trophy, Users } from 'lucide-react'

export default function Matchmaker({ session }: { session: any }) {
  const [isPending, startTransition] = useTransition()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center relative">
      <a href="/dashboard/session" className="absolute top-6 left-6 p-3 bg-gray-800 rounded-full hover:bg-gray-700 transition shadow-lg">
        <Users className="w-6 h-6 text-gray-300" />
      </a>

      <div className="bg-gray-800 p-8 rounded-3xl max-w-lg w-full shadow-2xl border border-gray-700">
        <Trophy className="w-20 h-20 mx-auto text-yellow-500 mb-6" />
        <h2 className="text-3xl font-black mb-2 text-white">Ready for the Court</h2>
        <p className="text-gray-400 mb-8">The matchmaking algorithm will draft the most balanced teams based on MMR and rotation history.</p>
        
        <button 
          onClick={() => {
            startTransition(() => {
              generateMatch(session.id)
            })
          }}
          disabled={isPending}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xl py-5 rounded-2xl transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50"
        >
          {isPending ? 'Drafting Teams...' : 'Generate Match'}
        </button>
      </div>
    </div>
  )
}
