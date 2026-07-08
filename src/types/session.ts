export interface Session {
  id: string;
  hoster_id: string;
  is_active: boolean;
  target_score: number;
  tie_breaker_rule: string;
  created_at: string;
  matchmaking_mode?: string;
  pending_draft?: unknown;
  pin?: string;
}
