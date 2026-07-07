export interface Match {
  id: string;
  session_id: string;
  hoster_id: string;
  team_a_score: number;
  team_b_score: number;
  team_a_players: string[];
  team_b_players: string[];
  team_a_positions?: Record<string, string>;
  team_b_positions?: Record<string, string>;
  is_completed: boolean;
  created_at: string;
  match_events?: MatchEvent[];
}

export interface MatchEvent {
  id: string;
  match_id: string;
  event_type: string;
  score_a?: number;
  score_b?: number;
}
