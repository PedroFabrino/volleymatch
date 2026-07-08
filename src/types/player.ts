export type PlayerPosition = 'Setter' | 'Outside Hitter' | 'Middle Blocker' | 'Opposite Hitter' | 'Libero' | 'Any';

export const SELECTABLE_POSITIONS: PlayerPosition[] = [
  'Setter',
  'Outside Hitter',
  'Middle Blocker',
  'Opposite Hitter',
  'Libero',
]

export const POSITION_SORT_ORDER: PlayerPosition[] = [
  'Setter',
  'Middle Blocker',
  'Outside Hitter',
  'Opposite Hitter',
  'Libero',
  'Any',
]

export type PlayerTier = 'Beginner' | 'Intermediate' | 'Advanced'

export const TIER_MMR: Record<PlayerTier, number> = {
  Beginner: 800,
  Intermediate: 1000,
  Advanced: 1200,
}

export function tierToMmr(tier: string): number {
  return TIER_MMR[tier as PlayerTier] ?? TIER_MMR.Intermediate
}

const PLAYER_POSITIONS: PlayerPosition[] = POSITION_SORT_ORDER

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

export type DashboardPlayer = {
  id: string
  name: string
  mmr: number
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
