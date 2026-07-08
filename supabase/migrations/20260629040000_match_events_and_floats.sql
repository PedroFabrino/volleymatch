-- 1. Change games_played_today to float (skip if already REAL)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'players'
      AND column_name = 'games_played_today'
      AND udt_name <> 'float4'
  ) THEN
    ALTER TABLE public.players
    ALTER COLUMN games_played_today TYPE REAL;
  END IF;
END $$;

-- 2. Create match_events table to replace point_timeline
CREATE TABLE IF NOT EXISTS public.match_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'score' or 'substitution'
    team TEXT, -- 'a' or 'b'
    increment INTEGER, -- for score events
    score_a INTEGER,
    score_b INTEGER,
    player_out_id UUID REFERENCES public.players(id),
    player_in_id UUID REFERENCES public.players(id),
    filled_position TEXT, -- what position they subbed in for
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Add explicit position tracking to matches for strict drafts, and remove the old point_timeline
ALTER TABLE public.matches
ADD COLUMN IF NOT EXISTS team_a_positions JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.matches
ADD COLUMN IF NOT EXISTS team_b_positions JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.matches
DROP COLUMN IF EXISTS point_timeline;
