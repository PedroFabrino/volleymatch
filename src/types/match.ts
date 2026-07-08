import type { PlayerPosition } from '@/types/player'

export interface Match {
  id: string;
  session_id: string;
  hoster_id: string;
  team_a_score: number;
  team_b_score: number;
  team_a_players: string[];
  team_b_players: string[];
  team_a_positions?: Record<string, PlayerPosition>;
  team_b_positions?: Record<string, PlayerPosition>;
  is_completed: boolean;
  created_at: string;
  match_events?: MatchEvent[];
}

export interface MatchEvent {
  id: string;
  match_id: string;
  event_type: string;
  team?: 'a' | 'b';
  increment?: number;
  score_a?: number;
  score_b?: number;
  player_out_id?: string;
  player_in_id?: string;
  filled_position?: PlayerPosition;
  created_at: string;
}

export type MatchDraft = {
  teamA: string[]
  teamB: string[]
  teamAPositions?: Record<string, PlayerPosition>
  teamBPositions?: Record<string, PlayerPosition>
}

export interface PointAttribution {
  id: string;
  match_id: string;
  session_id: string;
  score_a: number;
  score_b: number;
  attributed_to: string;
  team: 'a' | 'b';
  voter_token?: string;
  created_at?: string;
}
