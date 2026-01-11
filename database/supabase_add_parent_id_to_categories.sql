-- Migration: Add parent_id column to categories table for subcategories support
-- This migration adds the parent_id foreign key column to support hierarchical categories

-- Step 1: Add parent_id column to categories table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'categories' AND column_name = 'parent_id'
  ) THEN
    ALTER TABLE categories ADD COLUMN parent_id UUID REFERENCES categories(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 2: Create index for faster parent lookups
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);

-- Step 3: Add check constraint to prevent self-referencing (a category cannot be its own parent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'categories_no_self_reference'
  ) THEN
    ALTER TABLE categories ADD CONSTRAINT categories_no_self_reference 
      CHECK (id != parent_id);
  END IF;
END $$;

-- Step 4: Verify the column was added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'categories' AND column_name = 'parent_id'
  ) THEN
    RAISE EXCEPTION 'Failed to add parent_id column to categories table';
  END IF;
END $$;

-- Success message
SELECT 'Migration completed successfully! parent_id column added to categories table for subcategories support.' AS status;
