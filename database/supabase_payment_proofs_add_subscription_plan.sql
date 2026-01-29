-- Migration: Add subscription plan relationship to payment_proofs table
-- This migration establishes a proper foreign key relationship between payment_proofs and subscription_plans

-- Step 1: Add subscription_plan_id column to payment_proofs table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_proofs' AND column_name = 'subscription_plan_id'
  ) THEN
    ALTER TABLE payment_proofs ADD COLUMN subscription_plan_id UUID REFERENCES subscription_plans(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Step 2: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payment_proofs_subscription_plan_id ON payment_proofs(subscription_plan_id);

-- Step 3: Migrate existing data from plan_id (text) to subscription_plan_id (UUID)
-- Map 'monthly' and 'yearly' text values to actual subscription plan IDs
DO $$
DECLARE
  monthly_plan_id UUID;
  yearly_plan_id UUID;
BEGIN
  -- Get the IDs of the monthly and yearly plans (assuming they exist with these exact names)
  SELECT id INTO monthly_plan_id FROM subscription_plans WHERE LOWER(name) LIKE '%monthly%' OR duration_days = 30 LIMIT 1;
  SELECT id INTO yearly_plan_id FROM subscription_plans WHERE LOWER(name) LIKE '%yearly%' OR duration_days = 365 LIMIT 1;
  
  -- Update payment_proofs with the corresponding subscription_plan_id
  IF monthly_plan_id IS NOT NULL THEN
    UPDATE payment_proofs 
    SET subscription_plan_id = monthly_plan_id 
    WHERE LOWER(plan_id) = 'monthly' AND subscription_plan_id IS NULL;
  END IF;
  
  IF yearly_plan_id IS NOT NULL THEN
    UPDATE payment_proofs 
    SET subscription_plan_id = yearly_plan_id 
    WHERE LOWER(plan_id) = 'yearly' AND subscription_plan_id IS NULL;
  END IF;
  
  -- Log the migration results
  RAISE NOTICE 'Migrated payment proofs to use subscription_plan_id';
END $$;

-- Step 4: Verify the column was added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_proofs' AND column_name = 'subscription_plan_id'
  ) THEN
    RAISE EXCEPTION 'Failed to add subscription_plan_id column to payment_proofs table';
  END IF;
END $$;

-- Step 5: Add comment
COMMENT ON COLUMN payment_proofs.subscription_plan_id IS 'Foreign key reference to subscription_plans table. Replaces the legacy plan_id text field.';
COMMENT ON COLUMN payment_proofs.plan_id IS 'Legacy field - use subscription_plan_id instead. Kept for backward compatibility.';

-- Success message
SELECT 'Migration completed successfully! subscription_plan_id column added to payment_proofs table with foreign key to subscription_plans.' AS status;
