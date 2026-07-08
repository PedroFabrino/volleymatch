import type { PlayerPosition } from '@/types/player'

export type Player = {
  id: string;
  name: string;
  mmr: number;
  positions: PlayerPosition[];
  active_positions: PlayerPosition[] | null;
  games_played_today: number;
};

export type PlayerDraftStatus = 'in_next_match' | 'position_conflict' | 'sitting_out';

export type PlayerWithStatus = Player & {
  draftStatus: PlayerDraftStatus;
  draftedPosition?: PlayerPosition;
  positionSlotFill?: Array<{
    position: PlayerPosition;
    filled: number;
    total: number;
  }>;
};

export type MatchDraft = {
  teamA: string[];
  teamB: string[];
  teamAPositions?: Record<string, PlayerPosition>;
  teamBPositions?: Record<string, PlayerPosition>;
};

export type NextTeamSlot = {
  position: PlayerPosition;
  playerId: string | null;
  playerName: string | null;
  isTbd: boolean;
};

export type NextTeamPreview = {
  teamA: NextTeamSlot[];
  teamB: NextTeamSlot[];
  targetSize: number;
};
