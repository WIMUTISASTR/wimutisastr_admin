-- Create videos table for storing video metadata
CREATE TABLE IF NOT EXISTS videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  thumbnail_url TEXT,
  category_id UUID REFERENCES video_categories(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster searches
CREATE INDEX IF NOT EXISTS idx_videos_title ON videos(title);
CREATE INDEX IF NOT EXISTS idx_videos_category_id ON videos(category_id);

-- Enable Row Level Security
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "videos_select_policy" ON videos;
DROP POLICY IF EXISTS "videos_insert_policy" ON videos;
DROP POLICY IF EXISTS "videos_update_policy" ON videos;
DROP POLICY IF EXISTS "videos_delete_policy" ON videos;

-- Create policies that check if user is authenticated using auth.uid()
CREATE POLICY "videos_select_policy"
  ON videos FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "videos_insert_policy"
  ON videos FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "videos_update_policy"
  ON videos FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "videos_delete_policy"
  ON videos FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

