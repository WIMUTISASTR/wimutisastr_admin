-- Migration: Add cover_url column to categories table
-- This migration adds the cover_url column to support category cover images

-- Step 1: Add cover_url column to categories table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'categories' AND column_name = 'cover_url'
  ) THEN
    ALTER TABLE categories ADD COLUMN cover_url TEXT;
  END IF;
END $$;

-- Step 2: Verify the column was added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'categories' AND column_name = 'cover_url'
  ) THEN
    RAISE EXCEPTION 'Failed to add cover_url column to categories table';
  END IF;
END $$;

-- Success message
SELECT 'Migration completed successfully! cover_url column added to categories table.' AS status;
