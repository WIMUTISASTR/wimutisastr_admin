-- Migration: Add cover_url column to video_categories table
-- This migration adds the cover_url column to store category cover images
-- Run this in your Supabase SQL Editor

-- Step 1: Add cover_url column to video_categories table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'video_categories' AND column_name = 'cover_url'
  ) THEN
    ALTER TABLE video_categories ADD COLUMN cover_url TEXT;
  END IF;
END $$;

-- Step 2: Verify the column was added (this will show an error if something went wrong)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'video_categories' AND column_name = 'cover_url'
  ) THEN
    RAISE EXCEPTION 'Failed to add cover_url column to video_categories table';
  END IF;
END $$;

-- Success message
SELECT 'Migration completed successfully! cover_url column added to video_categories table.' AS status;

