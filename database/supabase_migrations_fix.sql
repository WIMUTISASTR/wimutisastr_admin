-- Fix RLS Policies for books table
-- Run this SQL in Supabase SQL Editor

-- Drop all existing policies first
DROP POLICY IF EXISTS "Allow authenticated users to read books" ON books;
DROP POLICY IF EXISTS "Allow authenticated users to insert books" ON books;
DROP POLICY IF EXISTS "Allow authenticated users to update books" ON books;
DROP POLICY IF EXISTS "Allow authenticated users to delete books" ON books;

-- Create new policies that will work
-- These policies check if user is authenticated using auth.uid()
CREATE POLICY "books_select_policy"
  ON books FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "books_insert_policy"
  ON books FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "books_update_policy"
  ON books FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "books_delete_policy"
  ON books FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

