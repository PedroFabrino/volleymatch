ALTER TABLE public.point_attributions
  ADD COLUMN scoring_type TEXT
    NOT NULL
    DEFAULT 'other'
    CHECK (scoring_type IN ('spike', 'block', 'ace', 'other'));
