-- Migration: Add category_id column to books table
-- This migration adds the category_id foreign key column to the books table
-- Run this in your Supabase SQL Editor

-- Step 1: Ensure categories table exists (if not already created)
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Add category_id column to books table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'books' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE books ADD COLUMN category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Step 3: Create index for faster category lookups
CREATE INDEX IF NOT EXISTS idx_books_category_id ON books(category_id);

-- Step 4: Verify the column was added (this will show an error if something went wrong)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'books' AND column_name = 'category_id'
  ) THEN
    RAISE EXCEPTION 'Failed to add category_id column to books table';
  END IF;
END $$;

-- Success message
SELECT 'Migration completed successfully! category_id column added to books table.' AS status;

