-- Add is_temporary to players
ALTER TABLE public.players ADD COLUMN is_temporary BOOLEAN NOT NULL DEFAULT false;
