CREATE TABLE public.session_players (
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    is_present BOOLEAN NOT NULL DEFAULT true,
    games_played REAL NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (session_id, player_id)
);

ALTER TABLE public.session_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosters can view their session players" 
ON public.session_players FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.sessions s 
        WHERE s.id = session_players.session_id AND s.hoster_id = auth.uid()
    )
);

CREATE POLICY "Hosters can insert their session players" 
ON public.session_players FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.sessions s 
        WHERE s.id = session_players.session_id AND s.hoster_id = auth.uid()
    )
);

CREATE POLICY "Hosters can update their session players" 
ON public.session_players FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.sessions s 
        WHERE s.id = session_players.session_id AND s.hoster_id = auth.uid()
    )
);

CREATE POLICY "Hosters can delete their session players" 
ON public.session_players FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM public.sessions s 
        WHERE s.id = session_players.session_id AND s.hoster_id = auth.uid()
    )
);
