-- Compare-and-set score update; returns applied flag + current scores
-- Fixes ambiguous column reference team_a_score in the WHERE clause
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

  UPDATE public.matches AS m
  SET team_a_score = v_new_a,
      team_b_score = v_new_b
  WHERE m.id = p_match_id
    AND m.team_a_score = p_expected_a
    AND m.team_b_score = p_expected_b
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
