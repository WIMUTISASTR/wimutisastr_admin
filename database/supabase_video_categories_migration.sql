-- Create video_categories table
CREATE TABLE IF NOT EXISTS video_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster searches
CREATE INDEX IF NOT EXISTS idx_video_categories_name ON video_categories(name);

-- Enable Row Level Security
ALTER TABLE video_categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "video_categories_select_policy" ON video_categories;
DROP POLICY IF EXISTS "video_categories_insert_policy" ON video_categories;
DROP POLICY IF EXISTS "video_categories_update_policy" ON video_categories;
DROP POLICY IF EXISTS "video_categories_delete_policy" ON video_categories;

-- Create policies that check if user is authenticated using auth.uid()
CREATE POLICY "video_categories_select_policy"
  ON video_categories FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "video_categories_insert_policy"
  ON video_categories FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "video_categories_update_policy"
  ON video_categories FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "video_categories_delete_policy"
  ON video_categories FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

