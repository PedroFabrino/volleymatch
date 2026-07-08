export type PlayerPosition = 'Setter' | 'Outside Hitter' | 'Middle Blocker' | 'Opposite Hitter' | 'Libero' | 'Any';

const PLAYER_POSITIONS: PlayerPosition[] = [
  'Setter',
  'Outside Hitter',
  'Middle Blocker',
  'Opposite Hitter',
  'Libero',
  'Any',
]

export function parsePlayerPosition(value: string): PlayerPosition | null {
  return (PLAYER_POSITIONS as string[]).includes(value) ? (value as PlayerPosition) : null
}

export function parsePlayerPositions(values: string[] | null | undefined): PlayerPosition[] {
  if (!values) return []
  return values
    .map(parsePlayerPosition)
    .filter((position): position is PlayerPosition => position !== null)
}

export type CreatePlayerInput = {
  hoster_id: string
  name: string
  mmr: number
  initial_tier: string
  positions: string[]
  is_present_today?: boolean
}

export interface Player {
  id: string;
  name: string;
  mmr: number;
  hoster_id: string;
  is_present_today: boolean;
  positions: PlayerPosition[];
  active_positions?: PlayerPosition[] | null;
  initial_tier?: string;
}

export type PlayerStat = {
  id: string;
  name: string;
  games_played: number;
  mmrChange: number;
  wins: number;
  winRate: number;
}
