-- Add summary_data column to sessions
ALTER TABLE public.sessions
  ADD COLUMN summary_data JSONB DEFAULT NULL;
