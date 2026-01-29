-- Fix Supabase database linter warnings:
-- 1) function_search_path_mutable: set a fixed search_path for selected functions
-- 2) rls_policy_always_true on subscription_plans: replace permissive service role policy with auth.role() = 'service_role'
--
-- Notes:
-- - This migration is safe to run multiple times.
-- - Leaked password protection is an Auth setting in Supabase Dashboard (cannot be fixed via SQL here).

-- 1) Fix function_search_path_mutable
-- Set a fixed search_path for functions flagged by the linter (if they exist).
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'update_subscription_plans_updated_at',
        'mark_user_notified',
        'update_updated_at_column',
        'has_approved_membership',
        'handle_new_user'
      )
  LOOP
    -- Set search_path to public only (schema-qualify objects inside functions if needed)
    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) SET search_path = public',
      r.schema_name,
      r.function_name,
      r.args
    );
  END LOOP;
END $$;

-- 2) Fix rls_policy_always_true on subscription_plans
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Drop the permissive policy if it exists (and any older name variants)
DROP POLICY IF EXISTS "Allow service role full access to subscription plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "subscription_plans_service_role_all" ON public.subscription_plans;

-- Recreate a safe service-role-only policy
CREATE POLICY "subscription_plans_service_role_all"
  ON public.subscription_plans
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

SELECT 'OK: fixed function search_path + tightened subscription_plans service-role policy' AS status;
