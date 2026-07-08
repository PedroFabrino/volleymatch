'use client'

import { useState, useTransition } from 'react'
import { generateMatch, saveMatch } from '../actions'
import { Check, Users, Trophy, RefreshCw, PowerOff } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { getActionErrorMessage } from '@/utils/getActionErrorMessage'
import { Session } from '@/types/session'
import { Player } from '@/types/player'
import { MatchDraft } from '@/types/match'
import { DraftTeamPanel } from './DraftTeamPanel'

import { useRouter } from 'next/navigation'

export default function Matchmaker({ session, players, isFirstMatch, onEndSession }: { session: Session, players: Player[], isFirstMatch: boolean, onEndSession?: (sessionId: string) => Promise<void> }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const [draft, setDraft] = useState<MatchDraft | null>((session.pending_draft as MatchDraft) ?? null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')
  const t = useTranslations('Matchmaker')
  const tErrors = useTranslations('Errors')

  const handleGenerate = async () => {
    if (isGenerating) return
    setIsGenerating(true)
    setError('')
    try {
      const result = await generateMatch(session.id)
      if (result) setDraft(result)
    } catch (e) {
      setError(getActionErrorMessage(e, tErrors, t('generateFailed')))
    } finally {
      setIsGenerating(false)
    }
  }

  const handleStart = async () => {
    if (!draft) return
    setError('')
    try {
      await saveMatch(session.id, draft.teamA, draft.teamB, draft.teamAPositions, draft.teamBPositions)
    } catch (e) {
      setError(getActionErrorMessage(e, tErrors, t('generateFailed')))
    }
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

  if (!isFirstMatch && !session.pending_draft) {
    return (
      <div className="flex flex-col items-center justify-center p-12 gap-4 h-full pt-32">
        <div className="animate-spin text-4xl">⚙️</div>
        <p className="text-gray-400 text-sm">{t('preparingDraft')}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center relative w-full overflow-y-auto">
      <a href="/dashboard/session" className="absolute top-6 left-6 p-3 bg-gray-800 rounded-full hover:bg-gray-700 transition shadow-lg z-10" title={t('backToDashboard')}>
        <Users className="w-6 h-6 text-gray-300" />
      </a>

      {!draft ? (
        <div className="bg-gray-800 p-8 rounded-3xl max-w-lg w-full shadow-2xl border border-gray-700 mt-20">
          <Trophy className="w-20 h-20 mx-auto text-yellow-500 mb-6" />
          <h2 className="text-3xl font-black mb-2 text-white">{t('ready')}</h2>
          <p className="text-gray-400 mb-8">{t('readyDesc')}</p>

          {error && (
            <div className="mb-4 bg-red-900/50 border border-red-500 text-red-200 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          <div className="flex flex-col gap-4">
            <button 
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xl py-5 rounded-2xl transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {isGenerating && <RefreshCw className="w-6 h-6 animate-spin" />}
              {isGenerating ? t('drafting') : t('generate')}
            </button>
            
            {onEndSession && (
            <button 
              onClick={async () => {
                if (confirm(t('confirmEndSession'))) {
                  await onEndSession(session.id)
                  router.push(`/dashboard/summary/${session.id}`)
                }
              }}
              disabled={isPending}
              className="w-full bg-red-900/40 hover:bg-red-800/60 border border-red-500/30 text-red-200 font-bold text-lg py-4 rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <PowerOff className="w-5 h-5" /> {t('endSession')}
            </button>
            )}
          </div>
        </div>
      ) : (
        <div className="w-full max-w-4xl pt-20 pb-8 flex flex-col gap-8">
          <h2 className="text-3xl font-black text-white">{t('draftPreview')}</h2>

          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-2 rounded-lg text-sm text-left">
              {error}
            </div>
          )}
          
          <div className="flex flex-col md:flex-row gap-6 w-full text-left">
            <DraftTeamPanel
              teamIds={draft.teamA}
              positions={draft.teamAPositions}
              players={players}
              teamColor="red"
              averageMmr={teamAMMR}
            />
            <DraftTeamPanel
              teamIds={draft.teamB}
              positions={draft.teamBPositions}
              players={players}
              teamColor="blue"
              averageMmr={teamBMMR}
            />
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
