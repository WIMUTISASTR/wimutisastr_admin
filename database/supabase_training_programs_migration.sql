-- Training programs (វគ្គបណ្តុះបណ្តាល) — courses, events, workshops shown on the public site.

CREATE TABLE IF NOT EXISTS public.training_programs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(200) NOT NULL,
  program_type TEXT NOT NULL DEFAULT 'course'
    CHECK (program_type IN ('course', 'event', 'workshop')),
  description TEXT,
  cover_url TEXT,
  event_start_at TIMESTAMP WITH TIME ZONE,
  event_end_at TIMESTAMP WITH TIME ZONE,
  location TEXT,
  instructor TEXT,
  highlights JSONB NOT NULL DEFAULT '[]'::jsonb,
  cta_label VARCHAR(80) DEFAULT 'សួរព័ត៌មាន',
  cta_url TEXT DEFAULT '/contact',
  is_published BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_training_programs_published
  ON public.training_programs (is_published, sort_order);

CREATE INDEX IF NOT EXISTS idx_training_programs_type
  ON public.training_programs (program_type);

ALTER TABLE public.training_programs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "training_programs_read_published" ON public.training_programs;
CREATE POLICY "training_programs_read_published"
  ON public.training_programs
  FOR SELECT
  USING (is_published = true);

DROP POLICY IF EXISTS "training_programs_write_service_role" ON public.training_programs;
CREATE POLICY "training_programs_write_service_role"
  ON public.training_programs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION update_training_programs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

DROP TRIGGER IF EXISTS set_training_programs_updated_at ON public.training_programs;
CREATE TRIGGER set_training_programs_updated_at
  BEFORE UPDATE ON public.training_programs
  FOR EACH ROW
  EXECUTE FUNCTION update_training_programs_updated_at();

COMMENT ON TABLE public.training_programs IS 'វគ្គបណ្តុះបណ្តាល — courses, events, and workshops for the public training page';
