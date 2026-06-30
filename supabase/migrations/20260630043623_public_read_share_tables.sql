-- Allow public read access to mmr_history and match_events for the share endpoint
CREATE POLICY "Allow public read access to mmr_history" 
ON public.mmr_history FOR SELECT 
TO public 
USING (true);

CREATE POLICY "Allow public read access to match_events" 
ON public.match_events FOR SELECT 
TO public 
USING (true);
