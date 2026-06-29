-- Add a PIN column to sessions for joining
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS pin TEXT;

-- Create an index for quick lookup by pin
CREATE INDEX IF NOT EXISTS idx_sessions_pin ON sessions(pin);

-- Add public read policies so unauthenticated users can view the session data
CREATE POLICY "Allow public read access to sessions" 
  ON sessions FOR SELECT 
  USING (true);

CREATE POLICY "Allow public read access to matches" 
  ON matches FOR SELECT 
  USING (true);

CREATE POLICY "Allow public read access to session_players" 
  ON session_players FOR SELECT 
  USING (true);

CREATE POLICY "Allow public read access to players" 
  ON players FOR SELECT 
  USING (true);

-- Enable Supabase Realtime for the necessary tables
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE session_players;

-- Explicitly grant SELECT to anon role so unauthenticated users aren't blocked at the table level
GRANT SELECT ON public.sessions TO anon;
GRANT SELECT ON public.matches TO anon;
GRANT SELECT ON public.session_players TO anon;
GRANT SELECT ON public.players TO anon;
