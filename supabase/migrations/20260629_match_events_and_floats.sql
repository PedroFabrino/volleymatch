-- 1. Change games_played_today to float
ALTER TABLE public.players
ALTER COLUMN games_played_today TYPE REAL;

-- 2. Create match_events table to replace point_timeline
CREATE TABLE public.match_events (
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

-- 3. Add explicit position tracking to matches for strict drafts
ALTER TABLE public.matches
ADD COLUMN team_a_positions JSONB DEFAULT '{}'::jsonb,
ADD COLUMN team_b_positions JSONB DEFAULT '{}'::jsonb;
