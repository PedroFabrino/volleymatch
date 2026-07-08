ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS matchmaking_mode TEXT DEFAULT 'casual';
