'use client'

import { useState, useTransition } from 'react'
import { generateMatch, saveMatch } from './actions'
import { endSession } from '@/app/dashboard/session/actions'
import { Trophy, Users, Check, RefreshCw, PowerOff } from 'lucide-react'
import { useTranslations } from 'next-intl'

export default function Matchmaker({ session, players, isFirstMatch }: { session: any, players: any[], isFirstMatch: boolean }) {
  const [isPending, startTransition] = useTransition()
  const [draft, setDraft] = useState<any>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const t = useTranslations('Matchmaker')
  const tPos = useTranslations('Positions')

  const handleGenerate = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const result = await generateMatch(session.id)
      if (result) setDraft(result)
    } catch (e) {
      console.error(e)
    } finally {
      setIsGenerating(false);
    }
  }

  const handleStart = () => {
    if (!draft) return
    startTransition(() => {
      saveMatch(session.id, draft.teamA, draft.teamB, draft.teamAPositions, draft.teamBPositions)
    })
  }

  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || 'Unknown'

  const sortOrder = ['Setter', 'Middle Blocker', 'Outside Hitter', 'Opposite Hitter', 'Libero', 'Any'];
  const sortPlayersByPos = (teamIds: string[], positions?: Record<string, string>) => {
    return [...teamIds].sort((a, b) => {
      const pA = players.find(p => p.id === a);
      const pB = players.find(p => p.id === b);
      const posA = (positions && positions[a] && positions[a] !== 'Any') ? positions[a] : (pA?.positions?.[0] || 'Any');
      const posB = (positions && positions[b] && positions[b] !== 'Any') ? positions[b] : (pB?.positions?.[0] || 'Any');
      const indexA = sortOrder.indexOf(posA);
      const indexB = sortOrder.indexOf(posB);
      return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
    });
  }

  const getTeamAverageMMR = (teamIds: string[]) => {
    if (!teamIds.length) return 0;
    const total = teamIds.reduce((sum, id) => {
      const p = players.find(p => p.id === id);
      return sum + (p?.mmr || 0);
    }, 0);
    return Math.round(total / teamIds.length);
  }

  const teamAMMR = draft ? getTeamAverageMMR(draft.teamA) : 0;
  const teamBMMR = draft ? getTeamAverageMMR(draft.teamB) : 0;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center relative w-full overflow-y-auto">
      <a href="/dashboard/session" className="absolute top-6 left-6 p-3 bg-gray-800 rounded-full hover:bg-gray-700 transition shadow-lg z-10" title="Back to Dashboard">
        <Users className="w-6 h-6 text-gray-300" />
      </a>

      {!draft ? (
        <div className="bg-gray-800 p-8 rounded-3xl max-w-lg w-full shadow-2xl border border-gray-700 mt-20">
          <Trophy className="w-20 h-20 mx-auto text-yellow-500 mb-6" />
          <h2 className="text-3xl font-black mb-2 text-white">{t('ready')}</h2>
          <p className="text-gray-400 mb-8">{t('readyDesc')}</p>
          
          <div className="flex flex-col gap-4">
            <button 
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xl py-5 rounded-2xl transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {isGenerating && <RefreshCw className="w-6 h-6 animate-spin" />}
              {isGenerating ? t('drafting') : t('generate')}
            </button>
            
            <button 
              onClick={() => {
                if (confirm('Are you sure you want to end this session?')) {
                  startTransition(() => {
                    endSession(session.id)
                  })
                }
              }}
              disabled={isPending}
              className="w-full bg-red-900/40 hover:bg-red-800/60 border border-red-500/30 text-red-200 font-bold text-lg py-4 rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <PowerOff className="w-5 h-5" /> End Session
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-4xl pt-20 pb-8 flex flex-col gap-8">
          <h2 className="text-3xl font-black text-white">{t('draftPreview')}</h2>
          
          <div className="flex flex-col md:flex-row gap-6 w-full text-left">
            <div className="flex-1 bg-red-900/20 border border-red-500/30 rounded-2xl p-6">
              <h3 className="text-red-400 font-bold text-xl mb-4 border-b border-red-500/30 pb-2 flex justify-between items-end">
                <span>{t('redTeam')}</span>
                <span className="text-xs font-bold text-red-500/70 tracking-wider">MMR: {teamAMMR}</span>
              </h3>
              <ul className="flex flex-col gap-2">
                {sortPlayersByPos(draft.teamA, draft.teamAPositions).map(id => {
                  const pos = draft.teamAPositions?.[id];
                  const p = players.find(p => p.id === id);
                  const displayPos = (pos && pos !== 'Any') ? pos : (p?.positions?.[0] || 'Any');
                  const isLibero = displayPos === 'Libero';
                  return (
                    <li key={id} className={`p-3 rounded-lg font-semibold flex justify-between items-center ${isLibero ? 'bg-amber-900/30 border border-amber-500/30 text-amber-100' : 'bg-gray-800/80 text-gray-100'}`}>
                      <span>{getPlayerName(id)}</span>
                      {displayPos !== 'Any' && (
                        <span className={`font-bold text-xs px-2 py-1 rounded ${isLibero ? 'bg-amber-900/60 text-amber-200' : 'bg-red-900/50 text-red-200'}`}>{tPos(displayPos as any)}</span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
            <div className="flex-1 bg-blue-900/20 border border-blue-500/30 rounded-2xl p-6">
              <h3 className="text-blue-400 font-bold text-xl mb-4 border-b border-blue-500/30 pb-2 flex justify-between items-end">
                <span>{t('blueTeam')}</span>
                <span className="text-xs font-bold text-blue-500/70 tracking-wider">MMR: {teamBMMR}</span>
              </h3>
              <ul className="flex flex-col gap-2">
                {sortPlayersByPos(draft.teamB, draft.teamBPositions).map(id => {
                  const pos = draft.teamBPositions?.[id];
                  const p = players.find(p => p.id === id);
                  const displayPos = (pos && pos !== 'Any') ? pos : (p?.positions?.[0] || 'Any');
                  const isLibero = displayPos === 'Libero';
                  return (
                    <li key={id} className={`p-3 rounded-lg font-semibold flex justify-between items-center ${isLibero ? 'bg-amber-900/30 border border-amber-500/30 text-amber-100' : 'bg-gray-800/80 text-gray-100'}`}>
                      <span>{getPlayerName(id)}</span>
                      {displayPos !== 'Any' && (
                        <span className={`font-bold text-xs px-2 py-1 rounded ${isLibero ? 'bg-amber-900/60 text-amber-200' : 'bg-blue-900/50 text-blue-200'}`}>{tPos(displayPos as any)}</span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>

          <div className="flex gap-4">
            {isFirstMatch && (
              <button 
                onClick={handleGenerate}
                disabled={isGenerating}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold text-lg py-4 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${isGenerating ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                {isGenerating ? t('generating') : t('reroll')}
              </button>
            )}
            <button 
              onClick={handleStart}
              disabled={isPending}
              className="flex-[2] bg-green-600 hover:bg-green-500 text-white font-bold text-xl py-4 rounded-xl transition-all shadow-lg shadow-green-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Check className="w-6 h-6" /> {t('startMatch')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
