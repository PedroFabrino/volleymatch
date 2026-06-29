'use client'

import { Trophy, RefreshCw } from 'lucide-react'

export default function SpectatorMatchmaker({ session, players, queue }: { session: any, players: any[], queue: any[] }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
      <div className="bg-gray-800 p-8 rounded-3xl max-w-lg w-full shadow-2xl border border-gray-700">
        <RefreshCw className="w-16 h-16 mx-auto text-blue-500 mb-6 animate-spin" />
        <h2 className="text-2xl font-black mb-2 text-white">Drafting Next Match</h2>
        <p className="text-gray-400 mb-8">Waiting for the host to start the next game...</p>
        
        <div className="border-t border-gray-700 pt-6 mt-6">
          <h3 className="text-gray-300 font-bold mb-4">Current Queue Order</h3>
          <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2">
            {queue.map((p, i) => (
              <div key={p.id} className="bg-gray-900 rounded-lg p-3 flex justify-between items-center text-left">
                <div className="flex items-center gap-3">
                  <span className={`font-bold w-6 text-center ${i < 12 ? 'text-green-500' : 'text-gray-500'}`}>{i + 1}</span>
                  <span className="font-bold text-gray-200">{p.name}</span>
                </div>
                <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">{p.games_played_today} games</span>
              </div>
            ))}
            {queue.length === 0 && (
              <p className="text-gray-500 text-sm">No players checked in yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
