-- Fix: Remove insecure RLS policies that reference auth.users.user_metadata on public.payment_proofs
-- Safe model:
-- - End users can INSERT/SELECT only their own rows (auth.uid() = user_id)
-- - Only service role (admin backend using SUPABASE_SERVICE_ROLE_KEY) can UPDATE/DELETE/SELECT all
-- This eliminates any dependency on user_metadata for authorization.

-- Ensure RLS is enabled
ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on payment_proofs (we don't assume names)
DO $$
DECLARE
  p RECORD;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'payment_proofs'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.payment_proofs', p.policyname);
  END LOOP;
END $$;

-- Users: can create their own payment proof
CREATE POLICY "payment_proofs_insert_own"
  ON public.payment_proofs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users: can view their own payment proofs
CREATE POLICY "payment_proofs_select_own"
  ON public.payment_proofs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role: full access for admin backend (bypasses user permissions safely)
CREATE POLICY "payment_proofs_service_role_all"
  ON public.payment_proofs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

SELECT 'OK: Replaced payment_proofs RLS policies (removed user_metadata references)' AS status;
