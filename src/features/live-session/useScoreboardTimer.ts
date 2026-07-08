import { useEffect, useState } from 'react'

export function useScoreboardTimer(matchCreatedAt: string) {
  const [elapsed, setElapsed] = useState('00:00')

  useEffect(() => {
    const startTime = new Date(matchCreatedAt).getTime()
    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - startTime) / 1000)
      const m = Math.floor(diff / 60).toString().padStart(2, '0')
      const s = (diff % 60).toString().padStart(2, '0')
      setElapsed(`${m}:${s}`)
    }, 1000)
    return () => clearInterval(interval)
  }, [matchCreatedAt])

  return elapsed
}
