import { Match } from '../../types/match'
import { DashboardPlayer } from '../../types/player'

export function computeDashboardStats(players: DashboardPlayer[], completedMatches: Match[]) {
  const playerStats: Record<string, { matches: number; wins: number; name: string, mmr: number }> = {}
  
  if (players) {
    players.forEach(p => {
      playerStats[p.id] = { matches: 0, wins: 0, name: p.name, mmr: p.mmr }
    })
  }

  if (completedMatches) {
    completedMatches.forEach(match => {
      const teamAWon = match.team_a_score > match.team_b_score
      const teamBWon = match.team_b_score > match.team_a_score

      match.team_a_players.forEach((pid: string) => {
        if (playerStats[pid]) {
          playerStats[pid].matches += 1
          if (teamAWon) playerStats[pid].wins += 1
        }
      })
      match.team_b_players.forEach((pid: string) => {
        if (playerStats[pid]) {
          playerStats[pid].matches += 1
          if (teamBWon) playerStats[pid].wins += 1
        }
      })
    })
  }

  // Sort players by Wins, then by MMR
  const rankedPlayers = Object.values(playerStats)
    .filter(p => p.matches > 0)
    .sort((a, b) => b.wins - a.wins || b.mmr - a.mmr)
    .slice(0, 5) // Top 5

  const latestMatches = completedMatches ? completedMatches.slice(0, 5) : []
  
  return { playerStats, rankedPlayers, latestMatches }
}
