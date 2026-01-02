-- Create books table for storing book metadata
CREATE TABLE IF NOT EXISTS books (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  year INTEGER NOT NULL,
  description TEXT,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  cover_url TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster searches
CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
CREATE INDEX IF NOT EXISTS idx_books_author ON books(author);
CREATE INDEX IF NOT EXISTS idx_books_year ON books(year);

-- Enable Row Level Security
ALTER TABLE books ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow authenticated users to read books" ON books;
DROP POLICY IF EXISTS "Allow authenticated users to insert books" ON books;
DROP POLICY IF EXISTS "Allow authenticated users to update books" ON books;
DROP POLICY IF EXISTS "Allow authenticated users to delete books" ON books;
DROP POLICY IF EXISTS "books_select_policy" ON books;
DROP POLICY IF EXISTS "books_insert_policy" ON books;
DROP POLICY IF EXISTS "books_update_policy" ON books;
DROP POLICY IF EXISTS "books_delete_policy" ON books;

-- Create policy to allow authenticated users to read books
-- Using auth.uid() to check if user is authenticated
CREATE POLICY "books_select_policy"
  ON books FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Create policy to allow authenticated users to insert books
CREATE POLICY "books_insert_policy"
  ON books FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Create policy to allow authenticated users to update books
CREATE POLICY "books_update_policy"
  ON books FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Create policy to allow authenticated users to delete books
CREATE POLICY "books_delete_policy"
  ON books FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- If table already exists, add cover_url column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'books' AND column_name = 'cover_url'
  ) THEN
    ALTER TABLE books ADD COLUMN cover_url TEXT;
  END IF;
END $$;
