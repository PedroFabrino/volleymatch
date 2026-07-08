export type Player = {
  id: string;
  name: string;
  mmr: number;
  positions: string[];
  active_positions: string[] | null;
  games_played_today: number;
};

export type PlayerDraftStatus = 'in_next_match' | 'position_conflict' | 'sitting_out';

export type PlayerWithStatus = Player & {
  draftStatus: PlayerDraftStatus;
  draftedPosition?: string;
  positionSlotFill?: Array<{
    position: string;
    filled: number;
    total: number;
  }>;
};

export type MatchDraft = {
  teamA: string[];
  teamB: string[];
  teamAPositions?: Record<string, string>;
  teamBPositions?: Record<string, string>;
};
