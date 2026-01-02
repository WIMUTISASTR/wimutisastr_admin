-- Add category_id column to books table
ALTER TABLE books ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

-- Create index for faster category lookups
CREATE INDEX IF NOT EXISTS idx_books_category_id ON books(category_id);

