import { Player } from '@/types/player'

export function buildQueuedPlayerList(
  players: Player[],
  activeMatch: { team_a_players: string[]; team_b_players: string[] } | null,
  sessionPlayersMap: Map<string, number>
): (Player & { games_played_today: number })[] {
  if (!players) return []
  
  if (activeMatch) {
    const playingIds = new Set([...activeMatch.team_a_players, ...activeMatch.team_b_players])
    return players
      .filter(p => p.is_present_today && !playingIds.has(p.id))
      .sort((a, b) => {
        const aGames = sessionPlayersMap.get(a.id) ?? 0
        const bGames = sessionPlayersMap.get(b.id) ?? 0
        return aGames - bGames
      })
      .map(p => ({ ...p, games_played_today: sessionPlayersMap.get(p.id) ?? 0 }))
  } else {
    return players
      .filter(p => p.is_present_today)
      .map(p => ({ ...p, games_played_today: sessionPlayersMap.get(p.id) ?? 0 }))
  }
}
