-- Add a PIN column to sessions for joining
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS pin TEXT;

-- Create an index for quick lookup by pin
CREATE INDEX IF NOT EXISTS idx_sessions_pin ON sessions(pin);

-- Add public read policies so unauthenticated users can view the session data
DROP POLICY IF EXISTS "Allow public read access to sessions" ON sessions;
CREATE POLICY "Allow public read access to sessions" 
  ON sessions FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Allow public read access to matches" ON matches;
CREATE POLICY "Allow public read access to matches" 
  ON matches FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Allow public read access to session_players" ON session_players;
CREATE POLICY "Allow public read access to session_players" 
  ON session_players FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Allow public read access to players" ON players;
CREATE POLICY "Allow public read access to players" 
  ON players FOR SELECT 
  USING (true);

-- Enable Supabase Realtime for the necessary tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'matches'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE matches;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'session_players'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE session_players;
  END IF;
END $$;

-- Explicitly grant SELECT to anon role so unauthenticated users aren't blocked at the table level
GRANT SELECT ON public.sessions TO anon;
GRANT SELECT ON public.matches TO anon;
GRANT SELECT ON public.session_players TO anon;
GRANT SELECT ON public.players TO anon;
