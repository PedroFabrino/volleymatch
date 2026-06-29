'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Repeat, Plus } from 'lucide-react'

export default function TimelineViewer({ timeline, matchStartTime, getPlayerName }: { timeline: any[], matchStartTime: string, getPlayerName: (id: string) => string }) {
  const [isOpen, setIsOpen] = useState(false)

  if (!timeline || timeline.length === 0) {
    return null
  }

  const startTimestamp = new Date(matchStartTime).getTime()

  return (
    <div className="mt-6 border-t dark:border-gray-800 pt-4">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition"
      >
        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        {isOpen ? 'Hide Match Timeline' : 'View Match Timeline'}
      </button>

      {isOpen && (
        <div className="mt-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 dark:before:via-gray-800 before:to-transparent">
          <div className="flex flex-col gap-6 py-4">
            {timeline.map((event, index) => {
              const eventTime = new Date(event.timestamp).getTime()
              const diffSecs = Math.max(0, Math.floor((eventTime - startTimestamp) / 1000))
              const m = Math.floor(diffSecs / 60).toString().padStart(2, '0')
              const s = (diffSecs % 60).toString().padStart(2, '0')
              const timeString = `${m}:${s}`

              if (event.type === 'substitution') {
                return (
                  <div key={index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-gray-900 bg-gray-200 dark:bg-gray-800 text-gray-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                      <Repeat className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-gray-900 dark:text-white text-sm">Substitution ({event.team === 'a' ? 'Red' : 'Blue'})</span>
                        <time className="text-xs font-mono text-gray-400">{timeString}</time>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        <span className="text-red-500 line-through mr-1">{getPlayerName(event.playerOutId)}</span>
                        <span className="text-green-500 font-bold ml-1">{getPlayerName(event.playerInId)}</span>
                      </div>
                    </div>
                  </div>
                )
              }

              // Normal Point Event
              const isTeamA = event.team === 'a'
              const bgIconColor = isTeamA ? 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'
              const scoreString = `${event.scoreA} - ${event.scoreB}`

              return (
                <div key={index} className={`relative flex items-center justify-between md:justify-normal ${!isTeamA ? 'md:flex-row-reverse' : ''} group`}>
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-gray-900 ${bgIconColor} shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10`}>
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
                      {isTeamA ? 'Red Team Scores' : 'Blue Team Scores'}
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
