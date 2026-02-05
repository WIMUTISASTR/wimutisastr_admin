-- Add access level to books and videos for free vs members-only content.

ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS access_level TEXT NOT NULL DEFAULT 'members';

ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS access_level TEXT NOT NULL DEFAULT 'members';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'books_access_level_check'
  ) THEN
    ALTER TABLE public.books
      ADD CONSTRAINT books_access_level_check
      CHECK (access_level IN ('free', 'members'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'videos_access_level_check'
  ) THEN
    ALTER TABLE public.videos
      ADD CONSTRAINT videos_access_level_check
      CHECK (access_level IN ('free', 'members'));
  END IF;
END $$;
