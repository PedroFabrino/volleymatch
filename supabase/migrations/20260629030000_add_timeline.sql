ALTER TABLE public.matches
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.matches
ADD COLUMN IF NOT EXISTS point_timeline JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.players
ADD COLUMN IF NOT EXISTS active_positions court_position[] DEFAULT NULL;
