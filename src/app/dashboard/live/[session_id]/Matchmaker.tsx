'use client'

import { useState, useTransition } from 'react'
import { generateMatch, saveMatch } from './actions'
import { Trophy, Users, Check, RefreshCw } from 'lucide-react'

export default function Matchmaker({ session, players }: { session: any, players: any[] }) {
  const [isPending, startTransition] = useTransition()
  const [draft, setDraft] = useState<{ teamA: string[], teamB: string[] } | null>(null)

  const handleGenerate = async () => {
    startTransition(async () => {
      const result = await generateMatch(session.id)
      if (result) setDraft(result)
    })
  }

  const handleStart = () => {
    if (!draft) return
    startTransition(() => {
      saveMatch(session.id, draft.teamA, draft.teamB)
    })
  }

  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || 'Unknown'

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center relative w-full overflow-y-auto">
      <a href="/dashboard/session" className="absolute top-6 left-6 p-3 bg-gray-800 rounded-full hover:bg-gray-700 transition shadow-lg z-10">
        <Users className="w-6 h-6 text-gray-300" />
      </a>

      {!draft ? (
        <div className="bg-gray-800 p-8 rounded-3xl max-w-lg w-full shadow-2xl border border-gray-700 mt-20">
          <Trophy className="w-20 h-20 mx-auto text-yellow-500 mb-6" />
          <h2 className="text-3xl font-black mb-2 text-white">Ready for the Court</h2>
          <p className="text-gray-400 mb-8">The matchmaking algorithm will draft the most balanced teams based on player skill and rotation history.</p>
          
          <button 
            onClick={handleGenerate}
            disabled={isPending}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xl py-5 rounded-2xl transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {isPending && <RefreshCw className="w-6 h-6 animate-spin" />}
            {isPending ? 'Drafting Teams...' : 'Generate Match'}
          </button>
        </div>
      ) : (
        <div className="w-full max-w-4xl pt-20 pb-8 flex flex-col gap-8">
          <h2 className="text-3xl font-black text-white">Draft Preview</h2>
          
          <div className="flex flex-col md:flex-row gap-6 w-full text-left">
            <div className="flex-1 bg-red-900/20 border border-red-500/30 rounded-2xl p-6">
              <h3 className="text-red-400 font-bold text-xl mb-4 border-b border-red-500/30 pb-2">Red Team</h3>
              <ul className="flex flex-col gap-2">
                {draft.teamA.map(id => (
                  <li key={id} className="bg-gray-800/80 p-3 rounded-lg font-semibold text-gray-100">{getPlayerName(id)}</li>
                ))}
              </ul>
            </div>
            <div className="flex-1 bg-blue-900/20 border border-blue-500/30 rounded-2xl p-6">
              <h3 className="text-blue-400 font-bold text-xl mb-4 border-b border-blue-500/30 pb-2">Blue Team</h3>
              <ul className="flex flex-col gap-2">
                {draft.teamB.map(id => (
                  <li key={id} className="bg-gray-800/80 p-3 rounded-lg font-semibold text-gray-100">{getPlayerName(id)}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={handleGenerate}
              disabled={isPending}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold text-lg py-4 rounded-xl transition-all disabled:opacity-50"
            >
              Re-roll Draft
            </button>
            <button 
              onClick={handleStart}
              disabled={isPending}
              className="flex-[2] bg-green-600 hover:bg-green-500 text-white font-bold text-xl py-4 rounded-xl transition-all shadow-lg shadow-green-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Check className="w-6 h-6" /> Start Match
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
