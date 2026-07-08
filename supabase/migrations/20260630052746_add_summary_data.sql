-- Add summary_data column to sessions
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS summary_data JSONB DEFAULT NULL;
