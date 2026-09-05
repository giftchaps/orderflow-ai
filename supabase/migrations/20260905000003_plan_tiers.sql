-- Plan tiers: the single source of truth for what "Starter", "Growth" and
-- "Pro" actually mean. Before this migration those numbers were hardcoded
-- (and copy-pasted) in three different frontend files, so changing a price
-- meant a code change and a redeploy, and nothing anywhere actually enforced
-- what each plan promised (order limits, seat limits). This table replaces
-- all of that with rows an admin can edit from Admin -> Plans.
--
-- The set of plan ids is intentionally still fixed to the three values the
-- businesses.plan CHECK constraint already allows (see
-- 20260903000000_multi_tenant_platform.sql) -- adding a fourth tier is a
-- bigger change (new checkout option, new CHECK constraint) left for later.
CREATE TABLE IF NOT EXISTS plan_tiers (
  id TEXT PRIMARY KEY CHECK (id IN ('starter', 'growth', 'pro')),
  label TEXT NOT NULL,
  price_cents INTEGER NOT NULL DEFAULT 0,
  -- NULL = unlimited. Enforcement is soft everywhere (see lib/plans.ts) --
  -- a business is never blocked from taking a real order or the kitchen
  -- display never goes down because a limit was hit; it just gets a clear
  -- "you're at N/limit, consider upgrading" nudge in Settings -> Billing.
  monthly_order_limit INTEGER,
  -- NULL = unlimited. Unlike the order limit, this one is enforced at the
  -- point of inviting a NEW team member (a deliberate action, not something
  -- that can happen mid-service), so existing teams are never affected by
  -- turning this on later.
  staff_seat_limit INTEGER,
  priority_support BOOLEAN NOT NULL DEFAULT false,
  -- The Stripe Price object this plan charges. Stripe prices are immutable,
  -- so changing what a plan actually costs means creating a new Price in
  -- Stripe and pasting its id here -- price_cents above is the *display*
  -- number shown in the app and must be kept in sync by whoever edits this.
  stripe_price_id TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed with the numbers already advertised in the app before this table
-- existed, so turning this migration on changes nothing about what
-- customers see until an admin edits a row.
INSERT INTO plan_tiers (id, label, price_cents, monthly_order_limit, staff_seat_limit, priority_support, sort_order)
VALUES
  ('starter', 'Starter', 4900, 100, NULL, false, 1),
  ('growth', 'Growth', 9900, 500, NULL, false, 2),
  ('pro', 'Pro', 14900, NULL, NULL, true, 3)
ON CONFLICT (id) DO NOTHING;

-- The app always reads/writes this table with the service-role key (RLS
-- doesn't apply to it), same as platform_admins and audit_logs. RLS is
-- enabled anyway as defense-in-depth, matching those tables: plan pricing
-- isn't sensitive, so any signed-in user may read it, but only a platform
-- admin may change it if this table were ever queried with a user's key.
ALTER TABLE plan_tiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS read_plan_tiers ON plan_tiers;
CREATE POLICY read_plan_tiers ON plan_tiers FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS admins_write_plan_tiers ON plan_tiers;
CREATE POLICY admins_write_plan_tiers ON plan_tiers FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());
