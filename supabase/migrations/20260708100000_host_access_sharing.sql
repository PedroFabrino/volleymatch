-- Host access grants + delegation RLS + compare-and-set scoring

CREATE TABLE public.hoster_access_grants (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_hoster_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  grantee_user_id   UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_email      TEXT,
  permissions       TEXT[] NOT NULL DEFAULT '{}',
  scope             TEXT NOT NULL DEFAULT 'persistent'
                    CHECK (scope IN ('session', 'persistent')),
  session_id        UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  expires_at        TIMESTAMPTZ,
  revoked_at        TIMESTAMPTZ,
  granted_by        UUID NOT NULL REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT grantee_or_email CHECK (
    grantee_user_id IS NOT NULL OR invite_email IS NOT NULL
  )
);

CREATE INDEX hoster_access_grants_owner_idx ON public.hoster_access_grants (owner_hoster_id);
CREATE INDEX hoster_access_grants_grantee_idx ON public.hoster_access_grants (grantee_user_id);
CREATE INDEX hoster_access_grants_email_idx ON public.hoster_access_grants (lower(invite_email));
CREATE INDEX hoster_access_grants_active_idx ON public.hoster_access_grants (owner_hoster_id, grantee_user_id)
  WHERE revoked_at IS NULL;

ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.hoster_access_grants ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_grant_active(
  g public.hoster_access_grants,
  target_session_id UUID DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT g.revoked_at IS NULL
    AND (g.expires_at IS NULL OR g.expires_at > now())
    AND (
      g.scope = 'persistent'
      OR g.session_id IS NULL
      OR target_session_id IS NULL
      OR g.session_id = target_session_id
    );
$$;

CREATE OR REPLACE FUNCTION public.has_hoster_access(
  target_hoster_id UUID,
  target_session_id UUID DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() = target_hoster_id
    OR EXISTS (
      SELECT 1 FROM public.hoster_access_grants g
      WHERE g.owner_hoster_id = target_hoster_id
        AND g.grantee_user_id = auth.uid()
        AND public.is_grant_active(g, target_session_id)
    );
$$;

CREATE OR REPLACE FUNCTION public.can_act_on_hoster(
  target_hoster_id UUID,
  required_permission TEXT,
  target_session_id UUID DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() = target_hoster_id
    OR EXISTS (
      SELECT 1 FROM public.hoster_access_grants g
      WHERE g.owner_hoster_id = target_hoster_id
        AND g.grantee_user_id = auth.uid()
        AND required_permission = ANY(g.permissions)
        AND public.is_grant_active(g, target_session_id)
    );
$$;

-- Compare-and-set score update; returns applied flag + current scores
CREATE OR REPLACE FUNCTION public.apply_match_score_delta(
  p_match_id UUID,
  p_team TEXT,
  p_delta INTEGER,
  p_expected_a INTEGER,
  p_expected_b INTEGER
) RETURNS TABLE(applied BOOLEAN, team_a_score INTEGER, team_b_score INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_a INTEGER;
  v_new_b INTEGER;
  v_row public.matches%ROWTYPE;
BEGIN
  IF p_team = 'a' THEN
    v_new_a := GREATEST(0, p_expected_a + p_delta);
    v_new_b := p_expected_b;
  ELSIF p_team = 'b' THEN
    v_new_a := p_expected_a;
    v_new_b := GREATEST(0, p_expected_b + p_delta);
  ELSE
    RAISE EXCEPTION 'invalid team';
  END IF;

  UPDATE public.matches
  SET team_a_score = v_new_a,
      team_b_score = v_new_b
  WHERE id = p_match_id
    AND team_a_score = p_expected_a
    AND team_b_score = p_expected_b
    AND is_completed = false
  RETURNING * INTO v_row;

  IF FOUND THEN
    INSERT INTO public.match_events (
      match_id, event_type, team, increment, score_a, score_b
    ) VALUES (
      p_match_id, 'score', p_team, p_delta, v_row.team_a_score, v_row.team_b_score
    );
    RETURN QUERY SELECT true, v_row.team_a_score, v_row.team_b_score;
    RETURN;
  END IF;

  SELECT * INTO v_row FROM public.matches WHERE id = p_match_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  RETURN QUERY SELECT false, v_row.team_a_score, v_row.team_b_score;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_match_score_delta TO authenticated;

-- Grants table policies
CREATE POLICY "Owners manage their access grants"
  ON public.hoster_access_grants FOR ALL
  USING (auth.uid() = owner_hoster_id)
  WITH CHECK (auth.uid() = owner_hoster_id);

CREATE POLICY "Grantees view their grants"
  ON public.hoster_access_grants FOR SELECT
  USING (grantee_user_id = auth.uid());

CREATE POLICY "Grantees accept pending invite"
  ON public.hoster_access_grants FOR UPDATE
  USING (
    grantee_user_id IS NULL
    AND invite_email IS NOT NULL
    AND lower(invite_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
  WITH CHECK (grantee_user_id = auth.uid());

GRANT ALL ON public.hoster_access_grants TO authenticated, service_role;

-- Players policies
DROP POLICY IF EXISTS "Hosters can view their own players" ON public.players;
DROP POLICY IF EXISTS "Hosters can insert their own players" ON public.players;
DROP POLICY IF EXISTS "Hosters can update their own players" ON public.players;
DROP POLICY IF EXISTS "Hosters can delete their own players" ON public.players;

CREATE POLICY "Hosters and delegates can view players"
  ON public.players FOR SELECT
  USING (public.has_hoster_access(hoster_id));

CREATE POLICY "Hosters and delegates can insert players"
  ON public.players FOR INSERT
  WITH CHECK (public.can_act_on_hoster(hoster_id, 'roster_add'));

CREATE POLICY "Hosters and delegates can update players"
  ON public.players FOR UPDATE
  USING (
    public.can_act_on_hoster(hoster_id, 'roster_manage')
    OR public.can_act_on_hoster(hoster_id, 'attendance')
  );

CREATE POLICY "Hosters and delegates can delete players"
  ON public.players FOR DELETE
  USING (public.can_act_on_hoster(hoster_id, 'roster_manage'));

-- Sessions policies
DROP POLICY IF EXISTS "Hosters can view their own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Hosters can insert their own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Hosters can update their own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Hosters can delete their own sessions" ON public.sessions;

CREATE POLICY "Hosters and delegates can view sessions"
  ON public.sessions FOR SELECT
  USING (public.has_hoster_access(hoster_id, id));

CREATE POLICY "Hosters and delegates can insert sessions"
  ON public.sessions FOR INSERT
  WITH CHECK (public.can_act_on_hoster(hoster_id, 'session_start'));

CREATE POLICY "Hosters and delegates can update sessions"
  ON public.sessions FOR UPDATE
  USING (
    public.can_act_on_hoster(hoster_id, 'session_live', id)
    OR public.can_act_on_hoster(hoster_id, 'session_end', id)
    OR public.can_act_on_hoster(hoster_id, 'session_start', id)
  );

CREATE POLICY "Only owners can delete sessions"
  ON public.sessions FOR DELETE
  USING (auth.uid() = hoster_id);

-- Matches policies
DROP POLICY IF EXISTS "Hosters can view their own matches" ON public.matches;
DROP POLICY IF EXISTS "Hosters can insert their own matches" ON public.matches;
DROP POLICY IF EXISTS "Hosters can update their own matches" ON public.matches;
DROP POLICY IF EXISTS "Hosters can delete their own matches" ON public.matches;

CREATE POLICY "Hosters and delegates can view matches"
  ON public.matches FOR SELECT
  USING (public.has_hoster_access(hoster_id, session_id));

CREATE POLICY "Hosters and delegates can insert matches"
  ON public.matches FOR INSERT
  WITH CHECK (public.can_act_on_hoster(hoster_id, 'session_live', session_id));

CREATE POLICY "Hosters and delegates can update matches"
  ON public.matches FOR UPDATE
  USING (public.can_act_on_hoster(hoster_id, 'session_live', session_id));

CREATE POLICY "Hosters and delegates can delete matches"
  ON public.matches FOR DELETE
  USING (public.can_act_on_hoster(hoster_id, 'session_live', session_id));

-- Session players policies
DROP POLICY IF EXISTS "Hosters can view their session players" ON public.session_players;
DROP POLICY IF EXISTS "Hosters can insert their session players" ON public.session_players;
DROP POLICY IF EXISTS "Hosters can update their session players" ON public.session_players;
DROP POLICY IF EXISTS "Hosters can delete their session players" ON public.session_players;
DROP POLICY IF EXISTS "Hosters can view session players" ON public.session_players;
DROP POLICY IF EXISTS "Hosters can insert session players" ON public.session_players;
DROP POLICY IF EXISTS "Hosters can update session players" ON public.session_players;

CREATE POLICY "Hosters and delegates can view session players"
  ON public.session_players FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_players.session_id
        AND public.has_hoster_access(s.hoster_id, s.id)
    )
  );

CREATE POLICY "Hosters and delegates can insert session players"
  ON public.session_players FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_players.session_id
        AND (
          public.can_act_on_hoster(s.hoster_id, 'attendance', s.id)
          OR public.can_act_on_hoster(s.hoster_id, 'session_live', s.id)
          OR public.can_act_on_hoster(s.hoster_id, 'session_start', s.id)
        )
    )
  );

CREATE POLICY "Hosters and delegates can update session players"
  ON public.session_players FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_players.session_id
        AND (
          public.can_act_on_hoster(s.hoster_id, 'attendance', s.id)
          OR public.can_act_on_hoster(s.hoster_id, 'session_live', s.id)
        )
    )
  );

CREATE POLICY "Hosters and delegates can delete session players"
  ON public.session_players FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_players.session_id
        AND public.can_act_on_hoster(s.hoster_id, 'attendance', s.id)
    )
  );

-- Match events policies
DROP POLICY IF EXISTS "Hosters can view their match events" ON public.match_events;
DROP POLICY IF EXISTS "Hosters can insert their match events" ON public.match_events;
DROP POLICY IF EXISTS "Hosters can delete their match events" ON public.match_events;

CREATE POLICY "Hosters and delegates can view match events"
  ON public.match_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_events.match_id
        AND public.has_hoster_access(m.hoster_id, m.session_id)
    )
  );

CREATE POLICY "Hosters and delegates can insert match events"
  ON public.match_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_events.match_id
        AND public.can_act_on_hoster(m.hoster_id, 'session_live', m.session_id)
    )
  );

CREATE POLICY "Hosters and delegates can delete match events"
  ON public.match_events FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_events.match_id
        AND public.can_act_on_hoster(m.hoster_id, 'session_live', m.session_id)
    )
  );

-- MMR history policies
DROP POLICY IF EXISTS "Hosters can view their players mmr history" ON public.mmr_history;
DROP POLICY IF EXISTS "Hosters can insert mmr history" ON public.mmr_history;

CREATE POLICY "Hosters and delegates can view mmr history"
  ON public.mmr_history FOR SELECT
  USING (
    public.has_hoster_access(hoster_id, session_id)
    AND (
      auth.uid() = hoster_id
      OR public.can_act_on_hoster(hoster_id, 'history_view', session_id)
      OR public.can_act_on_hoster(hoster_id, 'session_live', session_id)
      OR public.can_act_on_hoster(hoster_id, 'session_start', session_id)
    )
  );

CREATE POLICY "Hosters and delegates can insert mmr history"
  ON public.mmr_history FOR INSERT
  WITH CHECK (
    public.can_act_on_hoster(hoster_id, 'session_start', session_id)
    OR public.can_act_on_hoster(hoster_id, 'session_live', session_id)
    OR auth.uid() = hoster_id
  );

-- Point attributions: delegates with session access can read
DROP POLICY IF EXISTS "Hosters can read their attributions" ON public.point_attributions;

CREATE POLICY "Hosters and delegates can read their attributions"
  ON public.point_attributions FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM public.sessions s
      WHERE public.has_hoster_access(s.hoster_id, s.id)
    )
  );
