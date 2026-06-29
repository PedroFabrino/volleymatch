ALTER TABLE public.matches
ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN point_timeline JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.players
ADD COLUMN active_positions court_position[] DEFAULT NULL;
