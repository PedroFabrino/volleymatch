'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Clock, ChevronDown, ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { submitPointAttribution } from './actions'

import { PlayerWithStatus } from '@/lib/matchmaking'
import { Session, Match } from '@/types'

export default function SpectatorScoreboard({ session, match, playersWithStatus }: { session: Session, match: Match, playersWithStatus: PlayerWithStatus[] }) {
  const t = useTranslations('Scoreboard')
  const posT = useTranslations('Positions')

  // Accordion State
  const [teamsOpen, setTeamsOpen] = useState(false)
  const [queueOpen, setQueueOpen] = useState(true)

  // Timer State
  const [elapsed, setElapsed] = useState('00:00')

  // Voting State
  type VotingState = 'idle' | 'voting' | 'voted'
  const [votingState, setVotingState] = useState<VotingState>('idle')
  const [votingTeam, setVotingTeam] = useState<'a' | 'b' | null>(null)
  const [votingScoreSnapshot, setVotingScoreSnapshot] = useState<{ a: number; b: number } | null>(null)
  const votingScoreSnapshotRef = useRef<{ a: number; b: number } | null>(null)
  const [voteCounts, setVoteCounts] = useState<Map<string, number>>(new Map())
  const [myVote, setMyVote] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(10)
  const prevScoreRef = useRef({ a: match.team_a_score, b: match.team_b_score })
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  useEffect(() => {
    const startTime = new Date(match.created_at).getTime()
    
    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - startTime) / 1000)
      const m = Math.floor(diff / 60).toString().padStart(2, '0')
      const s = (diff % 60).toString().padStart(2, '0')
      setElapsed(`${m}:${s}`)
    }, 1000)

    return () => clearInterval(interval)
  }, [match.created_at])

  // Realtime subscription for votes
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel('public:point_attributions_spectator')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'point_attributions',
          filter: `session_id=eq.${session.id}`,
        },
        (payload) => {
          const newVote = payload.new
          const snap = votingScoreSnapshotRef.current
          if (snap && snap.a === newVote.score_a && snap.b === newVote.score_b) {
            setVoteCounts(prev => {
              const next = new Map(prev)
              const count = next.get(newVote.attributed_to) || 0
              next.set(newVote.attributed_to, count + 1)
              return next
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [session.id])

  // Voting panel logic
  const getVoterToken = useCallback(() => {
    let token = localStorage.getItem('volleymatch_voter_token')
    if (!token) {
      token = crypto.randomUUID()
      localStorage.setItem('volleymatch_voter_token', token)
    }
    return token
  }, [])

  const openVotingPanel = useCallback((team: 'a' | 'b', scoreA: number, scoreB: number) => {
    setVotingTeam(team)
    const snap = { a: scoreA, b: scoreB }
    setVotingScoreSnapshot(snap)
    votingScoreSnapshotRef.current = snap
    setVotingState('voting')
    setCountdown(10)
    setVoteCounts(new Map())
    setToastMessage(null)
    
    getVoterToken() // ensure token exists
    const storedKey = `volleymatch_vote_${match.id}_${scoreA}_${scoreB}`
    const alreadyVotedFor = localStorage.getItem(storedKey)
    if (alreadyVotedFor) {
      setMyVote(alreadyVotedFor)
      setVotingState('voted')
    } else {
      setMyVote(null)
    }
  }, [match.id, getVoterToken])

  useEffect(() => {
    const prev = prevScoreRef.current
    const newA = match.team_a_score
    const newB = match.team_b_score

    const totalNew = newA + newB
    const totalPrev = prev.a + prev.b

    if (totalNew > totalPrev) {
      if (newA > prev.a) {
        openVotingPanel('a', newA, newB)
      } else if (newB > prev.b) {
        openVotingPanel('b', newA, newB)
      }
    }

    prevScoreRef.current = { a: newA, b: newB }
  }, [match.team_a_score, match.team_b_score, match.id, openVotingPanel])

  useEffect(() => {
    let timer: NodeJS.Timeout
    if ((votingState === 'voting' || votingState === 'voted') && countdown > 0) {
      timer = setTimeout(() => setCountdown(c => c - 1), 1000)
    } else if (countdown === 0 && votingState !== 'idle') {
      timer = setTimeout(() => setVotingState('idle'), 0)
    }
    return () => clearTimeout(timer)
  }, [votingState, countdown])

  const castVote = async (playerId: string, playerName: string) => {
    if (votingState !== 'voting' || !votingScoreSnapshot) return

    setMyVote(playerId)
    setVotingState('voted')
    setToastMessage(`Voted for ${playerName} ✓`)
    setTimeout(() => setToastMessage(null), 2000)

    const token = getVoterToken()
    const storedKey = `volleymatch_vote_${match.id}_${votingScoreSnapshot.a}_${votingScoreSnapshot.b}`
    localStorage.setItem(storedKey, playerId)

    await submitPointAttribution(
      match.id,
      session.id,
      playerId,
      votingTeam!,
      votingScoreSnapshot.a,
      votingScoreSnapshot.b,
      token
    )
  }

  const optScoreA = match.team_a_score
  const optScoreB = match.team_b_score

  const isMatchOver = optScoreA >= session.target_score || optScoreB >= session.target_score

  const teamAPlayers = match.team_a_players.map((id: string) => playersWithStatus.find(p => p.id === id)).filter(Boolean) as PlayerWithStatus[]
  const teamBPlayers = match.team_b_players.map((id: string) => playersWithStatus.find(p => p.id === id)).filter(Boolean) as PlayerWithStatus[]

  const benchPlayers = playersWithStatus.filter(p => !match.team_a_players.includes(p.id) && !match.team_b_players.includes(p.id))

  const sortOrder = ['Setter', 'Middle Blocker', 'Outside Hitter', 'Opposite Hitter', 'Libero', 'Any'];
  const sortPlayersByPos = (teamPlayers: PlayerWithStatus[], positions?: Record<string, string>) => {
    return [...teamPlayers].sort((a, b) => {
      // Fallback to their primary position if drafted position is missing/Any
      const posA = (positions && positions[a.id] !== 'Any') ? positions[a.id] : (a.positions?.[0] || 'Any');
      const posB = (positions && positions[b.id] !== 'Any') ? positions[b.id] : (b.positions?.[0] || 'Any');
      const indexA = sortOrder.indexOf(posA);
      const indexB = sortOrder.indexOf(posB);
      return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
    });
  }

  return (
    <div className="flex flex-col h-[80vh] bg-gray-900 overflow-hidden relative rounded-3xl border border-gray-800 shadow-2xl">
      
      {/* SCOREBOARD SECTION */}
      <div className="relative flex flex-row w-full h-[35vh] shrink-0 border-b border-gray-800 shadow-lg z-20">
        
        {/* Top Bar Overlay */}
        <div className="flex justify-between items-center p-4 bg-gray-950/60 absolute w-full top-0 z-10 text-white font-mono uppercase tracking-widest text-xs font-bold pointer-events-none">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full"><Clock className="w-4 h-4 text-blue-400" /> {elapsed}</span>
          </div>
          <div>{t('target')} {session.target_score}</div>
        </div>

        {/* Team A (Red) */}
        <div className="relative flex-1 flex items-center justify-center bg-red-600">
          <div className="text-[20vh] font-black text-white leading-none pt-4">
            {optScoreA}
          </div>
        </div>

        {/* Divider */}
        <div className="h-full w-2 bg-gray-950 z-10" />

        {/* Team B (Blue) */}
        <div className="relative flex-1 flex items-center justify-center bg-blue-600">
          <div className="text-[20vh] font-black text-white leading-none pt-4">
            {optScoreB}
          </div>
        </div>
      </div>

      {/* TEAM ROSTER SECTION */}
      <div className="bg-gray-900 shrink-0 border-b border-gray-800 z-10 shadow-md">
        <button 
          onClick={() => setTeamsOpen(!teamsOpen)}
          className="w-full flex justify-between items-center p-4 text-gray-400 hover:text-gray-200 transition-colors"
        >
          <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
            {teamsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            {t('liveMatchRosters')}
          </h3>
          <span className="text-xs bg-gray-800 px-2 py-1 rounded">{t('playersCount', { count: 12 })}</span>
        </button>
        
        {teamsOpen && (
          <div className="flex flex-row w-full bg-gray-900 border-t border-gray-800">
            
            {/* Team A Roster */}
            <div className="flex-1 p-4 border-r border-gray-800 max-h-[35vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700">
          <div className="flex justify-between items-center border-b border-red-900/50 pb-2 mb-3">
            <h3 className="text-red-500 font-black text-lg uppercase tracking-wide">{t('redTeam')}</h3>
          </div>
          <ul className="flex flex-col gap-2">
            {sortPlayersByPos(teamAPlayers, match.team_a_positions).map((p: PlayerWithStatus) => {
              const pos = match.team_a_positions?.[p.id];
              const displayPos = (pos && pos !== 'Any') ? pos : (p.positions?.[0] || 'Any');
              const isLibero = displayPos === 'Libero';
              return (
              <li key={p.id} className={`rounded-lg p-3 shadow flex flex-col justify-center ${isLibero ? 'bg-amber-900/30 border border-amber-500/30' : 'bg-gray-800'}`}>
                <div className={`font-bold ${isLibero ? 'text-amber-100' : 'text-gray-100'}`}>{p.name}</div>
                <div className="text-[10px] text-gray-400 mt-1 flex flex-wrap gap-1 font-bold">
                  {pos && pos !== 'Any' ? (
                    <span className={`px-2 py-0.5 rounded ${isLibero ? 'bg-amber-900/60 text-amber-200' : 'bg-red-900/50 text-red-200'}`}>{posT(pos as any)}</span>
                  ) : (
                    p.positions.length > 0 ? p.positions.map((ppos: string) => (
                      <span key={ppos} className={`px-1 rounded ${ppos === 'Libero' ? 'bg-amber-900/60 text-amber-200' : 'bg-gray-700'}`}>{posT(ppos as any)}</span>
                    )) : t('any')
                  )}
                </div>
              </li>
            )})}
          </ul>
        </div>

            {/* Team B Roster */}
            <div className="flex-1 p-4 pb-4 max-h-[35vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700">
          <div className="flex justify-between items-center border-b border-blue-900/50 pb-2 mb-3">
            <h3 className="text-blue-500 font-black text-lg uppercase tracking-wide">{t('blueTeam')}</h3>
          </div>
          <ul className="flex flex-col gap-2">
            {sortPlayersByPos(teamBPlayers, match.team_b_positions).map((p: PlayerWithStatus) => {
              const pos = match.team_b_positions?.[p.id];
              const displayPos = (pos && pos !== 'Any') ? pos : (p.positions?.[0] || 'Any');
              const isLibero = displayPos === 'Libero';
              return (
              <li key={p.id} className={`rounded-lg p-3 shadow flex flex-col justify-center ${isLibero ? 'bg-amber-900/30 border border-amber-500/30' : 'bg-gray-800'}`}>
                <div className={`font-bold ${isLibero ? 'text-amber-100' : 'text-gray-100'}`}>{p.name}</div>
                <div className="text-[10px] text-gray-400 mt-1 flex flex-wrap gap-1 font-bold">
                  {pos && pos !== 'Any' ? (
                    <span className={`px-2 py-0.5 rounded ${isLibero ? 'bg-amber-900/60 text-amber-200' : 'bg-blue-900/50 text-blue-200'}`}>{posT(pos as any)}</span>
                  ) : (
                    p.positions.length > 0 ? p.positions.map((ppos: string) => (
                      <span key={ppos} className={`px-1 rounded ${ppos === 'Libero' ? 'bg-amber-900/60 text-amber-200' : 'bg-gray-700'}`}>{posT(ppos as any)}</span>
                    )) : t('any')
                  )}
                </div>
              </li>
            )})}
            </ul>
          </div>
        </div>
        )}
      </div>

      {/* Queue Section */}
      <div className="bg-gray-950 flex-1 flex flex-col min-h-0 relative">
        <button 
          onClick={() => setQueueOpen(!queueOpen)}
          className="w-full flex justify-between items-center p-4 text-gray-400 hover:text-gray-200 transition-colors border-b border-gray-900 shadow-sm shrink-0"
        >
          <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
            {queueOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            {t('upNextQueue')}
          </h3>
          <span className="text-xs bg-gray-800 px-2 py-1 rounded">{t('playersCount', { count: benchPlayers.length })}</span>
        </button>
        
        {queueOpen && (
          <div className="flex flex-col gap-2 p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800 flex-1">
            {benchPlayers.map((p) => {
              let statusIcon = '🕐';
              let statusColor = 'border-gray-700 bg-gray-900 opacity-60';
              
              if (p.draftStatus === 'in_next_match') {
                statusIcon = '✅';
                statusColor = 'border-green-600 bg-green-900/30';
              } else if (p.draftStatus === 'position_conflict') {
                statusIcon = '⚠️';
                statusColor = 'border-amber-600/50 bg-amber-900/20 opacity-70';
              }

              return (
                <div key={p.id} className={`flex justify-between items-center rounded-lg px-3 py-2 border ${statusColor}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-sm">{statusIcon}</span>
                    <span className="font-bold text-gray-200 text-sm truncate">{p.name}</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {session.matchmaking_mode === 'strict' && (
                      <div className="flex flex-col gap-1 items-end ml-2">
                        {p.draftStatus === 'in_next_match' && p.draftedPosition === 'Any' && (
                          <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                            {t('any')}
                          </span>
                        )}
                        
                        {p.positionSlotFill && p.positionSlotFill.length > 0 && (
                          (p.draftStatus === 'in_next_match' && p.draftedPosition !== 'Any'
                            ? p.positionSlotFill.filter(f => f.position === p.draftedPosition)
                            : p.positionSlotFill
                          ).map(fill => (
                            <div key={fill.position} className="flex items-center gap-2">
                              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                                {posT(fill.position as any)}
                              </span>
                              <div className="flex gap-0.5">
                                {Array.from({ length: fill.total }).map((_, i) => (
                                  <div 
                                    key={i} 
                                    className={`w-1.5 h-1.5 rounded-full ${i < fill.filled ? 'bg-amber-500/70' : 'bg-gray-700'}`}
                                  />
                                ))}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            {benchPlayers.length === 0 && (
              <div className="text-gray-500 text-sm italic">{t('noBench')}</div>
            )}
          </div>
        )}
      </div>

      {/* Match Over Modal */}
      {isMatchOver && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm overflow-hidden flex flex-col items-center p-8 shadow-2xl">
            <h2 className="text-4xl font-black text-white mb-2 text-center uppercase tracking-wider">
              {t('matchDone')}
            </h2>
            <div className="flex items-center gap-4 text-3xl font-black mb-8">
              <span className="text-red-500">{optScoreA}</span>
              <span className="text-gray-500">-</span>
              <span className="text-blue-500">{optScoreB}</span>
            </div>
            <p className="text-gray-400 text-center animate-pulse">{t('waitingHost')}</p>
          </div>
        </div>
      )}

      {/* Voting Panel */}
      {votingState !== 'idle' && votingTeam && (
        <div className="absolute bottom-0 left-0 w-full bg-gray-950 border-t border-gray-800 p-4 z-40 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-full duration-300">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-black text-lg text-white">
              🏐 Who scored for <span className={votingTeam === 'a' ? 'text-red-500' : 'text-blue-500'}>{votingTeam === 'a' ? 'RED' : 'BLUE'}</span>?
            </h3>
            <div className="text-sm font-mono text-gray-400 bg-gray-900 px-2 py-1 rounded">
              {countdown}s ⏱
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            {(votingTeam === 'a' ? teamAPlayers : teamBPlayers).map((p: PlayerWithStatus | undefined) => {
              if (!p) return null
              const votes = voteCounts.get(p.id) || 0
              const isMyVote = myVote === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => castVote(p.id, p.name)}
                  disabled={votingState === 'voted'}
                  className={`flex justify-between items-center p-3 rounded-xl transition ${
                    isMyVote 
                      ? (votingTeam === 'a' ? 'bg-red-900/40 border border-red-500' : 'bg-blue-900/40 border border-blue-500')
                      : 'bg-gray-800 hover:bg-gray-700 border border-transparent'
                  } ${votingState === 'voted' && !isMyVote ? 'opacity-50 grayscale' : ''}`}
                >
                  <span className="font-bold text-white">{p.name} {isMyVote && '✓'}</span>
                  <span className="text-sm font-bold text-gray-400 bg-gray-900 px-2 py-1 rounded">
                    {votes} {votes === 1 ? 'vote' : 'votes'}
                  </span>
                </button>
              )
            })}
          </div>
          
          {toastMessage && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[120%] bg-green-600 text-white font-bold px-4 py-2 rounded-full shadow-lg animate-in fade-in zoom-in duration-200">
              {toastMessage}
            </div>
          )}
        </div>
      )}

    </div>
  )
}
