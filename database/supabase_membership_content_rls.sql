-- Enforce "approved membership" for reading content via Supabase (defense-in-depth)
-- This prevents authenticated-but-not-approved users from reading books/videos/categories directly via Supabase APIs.
-- Admin operations should use the service role (bypasses RLS) as done by the admin panel API routes.

-- Helper predicate (optional; inline EXISTS is fine too)
CREATE OR REPLACE FUNCTION public.has_approved_membership()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.membership_status = 'approved'
  );
$$;

-- BOOKS
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "books_select_policy" ON public.books;
DROP POLICY IF EXISTS "books_insert_policy" ON public.books;
DROP POLICY IF EXISTS "books_update_policy" ON public.books;
DROP POLICY IF EXISTS "books_delete_policy" ON public.books;

CREATE POLICY "books_select_members_only"
  ON public.books
  FOR SELECT
  TO authenticated
  USING (public.has_approved_membership());

-- Lock down writes for normal users (admin uses service role)
CREATE POLICY "books_write_service_role_only"
  ON public.books
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- VIDEOS
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "videos_select_policy" ON public.videos;
DROP POLICY IF EXISTS "videos_insert_policy" ON public.videos;
DROP POLICY IF EXISTS "videos_update_policy" ON public.videos;
DROP POLICY IF EXISTS "videos_delete_policy" ON public.videos;

CREATE POLICY "videos_select_members_only"
  ON public.videos
  FOR SELECT
  TO authenticated
  USING (public.has_approved_membership());

CREATE POLICY "videos_write_service_role_only"
  ON public.videos
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- BOOK CATEGORIES
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "categories_select_policy" ON public.categories;
DROP POLICY IF EXISTS "categories_insert_policy" ON public.categories;
DROP POLICY IF EXISTS "categories_update_policy" ON public.categories;
DROP POLICY IF EXISTS "categories_delete_policy" ON public.categories;

CREATE POLICY "categories_select_members_only"
  ON public.categories
  FOR SELECT
  TO authenticated
  USING (public.has_approved_membership());

CREATE POLICY "categories_write_service_role_only"
  ON public.categories
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- VIDEO CATEGORIES
ALTER TABLE public.video_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "video_categories_select_policy" ON public.video_categories;
DROP POLICY IF EXISTS "video_categories_insert_policy" ON public.video_categories;
DROP POLICY IF EXISTS "video_categories_update_policy" ON public.video_categories;
DROP POLICY IF EXISTS "video_categories_delete_policy" ON public.video_categories;

CREATE POLICY "video_categories_select_members_only"
  ON public.video_categories
  FOR SELECT
  TO authenticated
  USING (public.has_approved_membership());

CREATE POLICY "video_categories_write_service_role_only"
  ON public.video_categories
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Done
SELECT 'OK: membership-based RLS policies applied to books/videos/categories' AS status;
