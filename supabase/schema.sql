-- ==========================================
-- VOLLEYMATCH: MASTER SUPABASE SCHEMA
-- ==========================================

-- 1. Create Enums for Position and MMR Tier
CREATE TYPE public.mmr_tier AS ENUM ('Beginner', 'Intermediate', 'Advanced');
CREATE TYPE public.court_position AS ENUM ('Setter', 'Outside Hitter', 'Middle Blocker', 'Libero', 'Opposite Hitter');

-- 2. Create the Players Table
CREATE TABLE IF NOT EXISTS public.players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hoster_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    mmr INTEGER NOT NULL DEFAULT 1000,
    initial_tier mmr_tier NOT NULL DEFAULT 'Intermediate',
    positions court_position[] NOT NULL DEFAULT '{}',
    active_positions court_position[] DEFAULT '{}',
    games_played_today REAL NOT NULL DEFAULT 0,
    is_present_today BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create the Sessions (Game Days) Table
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hoster_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_score INTEGER NOT NULL DEFAULT 12,
    tie_breaker_rule TEXT NOT NULL DEFAULT 'win_by_2',
    matchmaking_mode TEXT NOT NULL DEFAULT 'casual',
    is_active BOOLEAN NOT NULL DEFAULT true,
    pin TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create the Matches Table
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    hoster_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    team_a_players UUID[] NOT NULL,
    team_b_players UUID[] NOT NULL,
    team_a_score INTEGER NOT NULL DEFAULT 0,
    team_b_score INTEGER NOT NULL DEFAULT 0,
    team_a_positions JSONB DEFAULT '{}'::jsonb,
    team_b_positions JSONB DEFAULT '{}'::jsonb,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create Session Players Table (Attendance & Games Played Tracking)
CREATE TABLE IF NOT EXISTS public.session_players (
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    is_present BOOLEAN NOT NULL DEFAULT true,
    games_played REAL NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (session_id, player_id)
);

-- 6. Create Match Events Table (Point & Substitution Timeline)
CREATE TABLE IF NOT EXISTS public.match_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, 
    team TEXT, 
    increment INTEGER, 
    score_a INTEGER,
    score_b INTEGER,
    player_out_id UUID REFERENCES public.players(id),
    player_in_id UUID REFERENCES public.players(id),
    filled_position TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_events ENABLE ROW LEVEL SECURITY;

-- Players Policies
CREATE POLICY "Hosters can view their own players" ON public.players FOR SELECT USING (auth.uid() = hoster_id);
CREATE POLICY "Hosters can insert their own players" ON public.players FOR INSERT WITH CHECK (auth.uid() = hoster_id);
CREATE POLICY "Hosters can update their own players" ON public.players FOR UPDATE USING (auth.uid() = hoster_id);
CREATE POLICY "Hosters can delete their own players" ON public.players FOR DELETE USING (auth.uid() = hoster_id);

-- Sessions Policies
CREATE POLICY "Hosters can view their own sessions" ON public.sessions FOR SELECT USING (auth.uid() = hoster_id);
CREATE POLICY "Hosters can insert their own sessions" ON public.sessions FOR INSERT WITH CHECK (auth.uid() = hoster_id);
CREATE POLICY "Hosters can update their own sessions" ON public.sessions FOR UPDATE USING (auth.uid() = hoster_id);
CREATE POLICY "Hosters can delete their own sessions" ON public.sessions FOR DELETE USING (auth.uid() = hoster_id);

-- Spectators (Unauthenticated) can view active sessions by PIN
CREATE POLICY "Spectators can view sessions by PIN" ON public.sessions FOR SELECT USING (is_active = true);

-- Matches Policies
CREATE POLICY "Hosters can view their own matches" ON public.matches FOR SELECT USING (auth.uid() = hoster_id);
CREATE POLICY "Hosters can insert their own matches" ON public.matches FOR INSERT WITH CHECK (auth.uid() = hoster_id);
CREATE POLICY "Hosters can update their own matches" ON public.matches FOR UPDATE USING (auth.uid() = hoster_id);
CREATE POLICY "Hosters can delete their own matches" ON public.matches FOR DELETE USING (auth.uid() = hoster_id);

-- Spectators (Unauthenticated) can view matches for active sessions
CREATE POLICY "Spectators can view matches of active sessions" ON public.matches FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = matches.session_id AND s.is_active = true)
);

-- Session Players Policies
CREATE POLICY "Hosters can view session players" ON public.session_players FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Hosters can insert session players" ON public.session_players FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Hosters can update session players" ON public.session_players FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Match Events Policies
CREATE POLICY "Hosters can view their match events" ON public.match_events FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.matches m WHERE m.id = match_events.match_id AND m.hoster_id = auth.uid())
);
CREATE POLICY "Hosters can insert their match events" ON public.match_events FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.matches m WHERE m.id = match_events.match_id AND m.hoster_id = auth.uid())
);
CREATE POLICY "Hosters can delete their match events" ON public.match_events FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.matches m WHERE m.id = match_events.match_id AND m.hoster_id = auth.uid())
);

-- Spectators (Unauthenticated) can view match events for active sessions
CREATE POLICY "Spectators can view match events" ON public.match_events FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.matches m
        JOIN public.sessions s ON s.id = m.session_id
        WHERE m.id = match_events.match_id AND s.is_active = true
    )
);
-- ==========================================
-- 6. mmr_history
-- ==========================================
CREATE TABLE public.mmr_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id   UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  hoster_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id    UUID REFERENCES public.matches(id) ON DELETE SET NULL,
  session_id  UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  old_mmr     INTEGER NOT NULL,
  new_mmr     INTEGER NOT NULL,
  mmr_change  INTEGER NOT NULL,
  reason      TEXT NOT NULL DEFAULT 'match_result',
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.mmr_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosters can view their players mmr history"
  ON public.mmr_history FOR SELECT USING (auth.uid() = hoster_id);

CREATE POLICY "Hosters can insert mmr history"
  ON public.mmr_history FOR INSERT WITH CHECK (auth.uid() = hoster_id);

-- ==========================================
-- Anonymous / QR Registration Policies
-- ==========================================
CREATE POLICY "Allow public insert to players" ON public.players FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public update to players" ON public.players FOR UPDATE TO anon USING (true);
CREATE POLICY "Allow public insert to session_players" ON public.session_players FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public update to session_players" ON public.session_players FOR UPDATE TO anon USING (true);

-- ==========================================
-- Grants
-- ==========================================
GRANT ALL ON public.mmr_history TO authenticated, service_role, anon;
