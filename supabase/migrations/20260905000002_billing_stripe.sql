-- Stripe billing fields on businesses. Nullable everywhere: a business with
-- no Stripe customer yet (comped, or hasn't subscribed) simply has all four
-- columns NULL, and the app already treats "plan" as a manual label in that
-- state, same as before this migration.
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT,
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;

-- One Stripe customer/subscription should never be attached to two businesses.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_businesses_stripe_customer_id
  ON businesses (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_businesses_stripe_subscription_id
  ON businesses (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;
