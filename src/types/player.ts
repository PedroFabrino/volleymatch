export interface Player {
  id: string;
  name: string;
  mmr: number;
  hoster_id: string;
  is_present_today: boolean;
  positions: string[];
  active_positions?: string[] | null;
}

export type PlayerStat = {
  id: string;
  name: string;
  games_played: number;
  mmrChange: number;
  wins: number;
  winRate: number;
}
