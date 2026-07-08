CREATE TABLE IF NOT EXISTS public.point_attributions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id         UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  session_id       UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  -- Score snapshot acts as the point identifier (no need to join match_events)
  score_a          INTEGER NOT NULL,
  score_b          INTEGER NOT NULL,
  -- Who spectators think scored
  attributed_to    UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  team             TEXT NOT NULL CHECK (team IN ('a', 'b')),
  -- Anonymous identity
  voter_token      TEXT NOT NULL,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- One vote per (match + score snapshot + voter token)
CREATE UNIQUE INDEX IF NOT EXISTS point_attributions_unique_vote
  ON public.point_attributions (match_id, score_a, score_b, voter_token);

ALTER TABLE public.point_attributions ENABLE ROW LEVEL SECURITY;

-- Spectators (anonymous) can insert votes
DROP POLICY IF EXISTS "Spectators can insert attributions" ON public.point_attributions;
CREATE POLICY "Spectators can insert attributions"
  ON public.point_attributions FOR INSERT WITH CHECK (true);

-- Public read for active sessions (spectators need to see live vote counts)
DROP POLICY IF EXISTS "Public can read attributions for active sessions" ON public.point_attributions;
CREATE POLICY "Public can read attributions for active sessions"
  ON public.point_attributions FOR SELECT
  USING (
    session_id IN (SELECT id FROM sessions WHERE is_active = true)
  );

-- Hosters can read their own historical attributions (for summary card)
DROP POLICY IF EXISTS "Hosters can read their attributions" ON public.point_attributions;
CREATE POLICY "Hosters can read their attributions"
  ON public.point_attributions FOR SELECT
  USING (
    session_id IN (SELECT id FROM sessions WHERE hoster_id = auth.uid())
  );

-- Enable Supabase Realtime for the table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'point_attributions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE point_attributions;
  END IF;
END $$;

-- Explicitly grant SELECT and INSERT to anon role
GRANT SELECT ON public.point_attributions TO anon;
GRANT INSERT ON public.point_attributions TO anon;
