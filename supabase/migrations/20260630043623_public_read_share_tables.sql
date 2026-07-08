-- Allow public read access to mmr_history and match_events for the share endpoint
DROP POLICY IF EXISTS "Allow public read access to mmr_history" ON public.mmr_history;
CREATE POLICY "Allow public read access to mmr_history" 
ON public.mmr_history FOR SELECT 
TO public 
USING (true);

DROP POLICY IF EXISTS "Allow public read access to match_events" ON public.match_events;
CREATE POLICY "Allow public read access to match_events" 
ON public.match_events FOR SELECT 
TO public 
USING (true);
