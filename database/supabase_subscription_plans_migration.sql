-- Create subscription_plans table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  duration_days INTEGER NOT NULL DEFAULT 30, -- 30 for monthly, 365 for yearly
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  qr_code_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  features JSONB DEFAULT '[]'::jsonb, -- Array of features included in this plan
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for active plans
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON public.subscription_plans(is_active);

-- Create index for sort order
CREATE INDEX IF NOT EXISTS idx_subscription_plans_sort_order ON public.subscription_plans(sort_order);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read active plans
DROP POLICY IF EXISTS "Allow authenticated users to read active plans" ON public.subscription_plans;
CREATE POLICY "Allow authenticated users to read active plans"
  ON public.subscription_plans
  FOR SELECT
  USING (is_active = true);

-- Policy: Allow service role full access (for admin operations)
DROP POLICY IF EXISTS "Allow service role full access to subscription plans" ON public.subscription_plans;
CREATE POLICY "Allow service role full access to subscription plans"
  ON public.subscription_plans
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_subscription_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

DROP TRIGGER IF EXISTS set_subscription_plans_updated_at ON public.subscription_plans;
CREATE TRIGGER set_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_plans_updated_at();

-- Insert default subscription plans
INSERT INTO public.subscription_plans (name, description, price, duration_days, features, sort_order) VALUES
  ('Monthly Plan', 'Access to all content for 30 days', 3.00, 30, '["Access to all books", "Access to all videos", "Monthly updates"]'::jsonb, 1),
  ('Yearly Plan', 'Access to all content for 365 days with 2 months free', 30.00, 365, '["Access to all books", "Access to all videos", "Yearly updates", "Priority support", "2 months free"]'::jsonb, 2)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE public.subscription_plans IS 'Stores subscription plan information for payment processing';
