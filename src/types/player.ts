export interface Player {
  id: string;
  name: string;
  mmr: number;
  hoster_id: string;
  is_present_today: boolean;
  positions: string[];
}
