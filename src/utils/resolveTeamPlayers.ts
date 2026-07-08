export function resolveTeamPlayers<T extends { id: string }>(
  playerIds: string[],
  players: T[]
): T[] {
  return playerIds
    .map(id => players.find(p => p.id === id))
    .filter((p): p is T => p !== undefined)
}
