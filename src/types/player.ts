export interface Player {
  id: string;
  name: string;
  mmr: number;
  hoster_id: string;
  is_present_today: boolean;
  positions: string[];
}

export type PlayerStat = {
  id: string;
  name: string;
  games_played: number;
  mmrChange: number;
  wins: number;
  winRate: number;
}
