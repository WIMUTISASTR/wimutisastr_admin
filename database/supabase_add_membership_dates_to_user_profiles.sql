-- Add membership date range to user_profiles so access can expire automatically.
-- These dates represent the current active membership window.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS membership_starts_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS membership_ends_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_user_profiles_membership_ends_at
  ON public.user_profiles(membership_ends_at);

