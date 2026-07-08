'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, ChevronUp, Repeat, Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { MatchEvent } from '../../../../types/match'

export default function TimelineViewer({ timeline, matchStartTime, playerNames }: { timeline: MatchEvent[], matchStartTime: string, playerNames: Record<string, string> }) {
  const [isOpen, setIsOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const t = useTranslations('Timeline')

  if (!timeline || timeline.length === 0) {
    return null
  }

  const startTimestamp = new Date(matchStartTime).getTime()
  const sortedEvents = [...timeline].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  // Reconstruct score history specifically for the grid
  const validScoreEvents = []
  for (const event of sortedEvents) {
    if (event.event_type === 'score') {
      if (event.increment > 0) {
        validScoreEvents.push(event)
      } else if (event.increment < 0) {
        for (let i = validScoreEvents.length - 1; i >= 0; i--) {
          if (validScoreEvents[i].team === event.team) {
            validScoreEvents.splice(i, 1)
            break
          }
        }
      }
    }
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
    }
  }, [timeline])

  return (
    <div className="mt-6 border-t dark:border-gray-800 pt-4 flex flex-col gap-4">

      {/* HORIZONTAL POINT GRID */}
      {validScoreEvents.length > 0 && (
        <div className="w-full overflow-x-auto pb-4 custom-scrollbar select-none" ref={scrollRef} style={{ scrollBehavior: 'smooth' }}>
          <div className="flex flex-col gap-2 min-w-max">
            {/* Row A (Red) */}
            <div className="flex gap-1.5 items-center">
              {validScoreEvents.map((ev, i) => (
                <div key={`a-${i}`} className={`w-9 h-9 rounded-md flex items-center justify-center font-black text-sm transition-all duration-300 ${ev.team === 'a' ? 'bg-red-500 text-white shadow-md scale-100' : 'bg-gray-100 dark:bg-gray-800 text-transparent scale-95 opacity-50'}`}>
                  {ev.team === 'a' ? ev.score_a : ''}
                </div>
              ))}
            </div>
            {/* Row B (Blue) */}
            <div className="flex gap-1.5 items-center">
              {validScoreEvents.map((ev, i) => (
                <div key={`b-${i}`} className={`w-9 h-9 rounded-md flex items-center justify-center font-black text-sm transition-all duration-300 ${ev.team === 'b' ? 'bg-blue-600 text-white shadow-md scale-100' : 'bg-gray-100 dark:bg-gray-800 text-transparent scale-95 opacity-50'}`}>
                  {ev.team === 'b' ? ev.score_b : ''}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VERTICAL TIMELINE TOGGLE */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition self-start"
      >
        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        {isOpen ? t('hideTimeline') : t('viewTimeline')}
      </button>

      {isOpen && (
        <div className="mt-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 dark:before:via-gray-800 before:to-transparent">
          <div className="flex flex-col gap-6 py-4">
            {sortedEvents.map((event, index) => {
              const eventTime = new Date(event.created_at).getTime()
              const diffSecs = Math.max(0, Math.floor((eventTime - startTimestamp) / 1000))
              const m = Math.floor(diffSecs / 60).toString().padStart(2, '0')
              const s = (diffSecs % 60).toString().padStart(2, '0')
              const timeString = `${m}:${s}`

              if (event.event_type === 'substitution') {
                return (
                  <div key={index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-gray-900 bg-gray-200 dark:bg-gray-800 text-gray-500 shadow shrink-0 md:absolute md:left-1/2 md:-translate-x-1/2 z-10">
                      <Repeat className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-gray-900 dark:text-white text-sm">{t('substitution')} ({event.team === 'a' ? t('red') : t('blue')})</span>
                        <time className="text-xs font-mono text-gray-400">{timeString}</time>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        <span className="text-red-500 line-through mr-1">{playerNames[event.player_out_id] || t('unknown')}</span>
                        <span className="text-green-500 font-bold ml-1">{playerNames[event.player_in_id] || t('unknown')}</span>
                      </div>
                    </div>
                  </div>
                )
              }

              // Normal Point Event
              const isTeamA = event.team === 'a'
              const bgIconColor = isTeamA ? 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'
              const scoreString = `${event.score_a} - ${event.score_b}`

              return (
                <div key={index} className={`relative flex items-center justify-between md:justify-normal ${!isTeamA ? 'md:flex-row-reverse' : ''} group`}>
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-gray-900 ${bgIconColor} shadow shrink-0 md:absolute md:left-1/2 md:-translate-x-1/2 z-10`}>
                    <Plus className="w-4 h-4" />
                  </div>
                  <div className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 ${!isTeamA ? 'md:text-right' : ''}`}>
                    <div className={`flex items-center justify-between mb-1 ${!isTeamA ? 'md:flex-row-reverse' : ''}`}>
                      <span className={`font-black text-lg ${isTeamA ? 'text-red-500' : 'text-blue-500'}`}>
                        {scoreString}
                      </span>
                      <time className="text-xs font-mono text-gray-400">{timeString}</time>
                    </div>
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      {isTeamA ? t('redScores') : t('blueScores')}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
