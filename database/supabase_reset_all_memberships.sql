-- Reset all user memberships back to "pending" and clear membership window.
-- Use this if you want to revoke access for everyone and start fresh.

BEGIN;

UPDATE public.user_profiles
SET
  membership_status = 'pending',
  membership_approved_at = NULL,
  membership_denied_at = NULL,
  membership_notes = NULL,
  membership_starts_at = NULL,
  membership_ends_at = NULL,
  updated_at = NOW();

COMMIT;

