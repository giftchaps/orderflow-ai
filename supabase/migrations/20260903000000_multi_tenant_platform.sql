-- ============================================================================
-- OrderFlow AI — Multi-tenant platform migration
--
-- Introduces:
--   * platform_admins            separate identity for OrderFlow operators
--   * businesses.status          lifecycle: draft | invited | active | suspended
--   * businesses_staff.status    invited | active | disabled (+ role constraint)
--   * businesses.display_pin_hash hashed kitchen PIN (plaintext column kept
--                                for backward compatibility, cleared on rotate)
--   * order lifecycle timestamps + order_events (append-only timeline)
--   * audit_logs, sms_messages, webhook_events (operational tables)
--   * RLS rewrite using a SECURITY DEFINER helper to avoid the recursive
--     businesses_staff policy that broke client reads.
--
-- Safe to run repeatedly (idempotent). Run in the Supabase SQL editor.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Platform administrators
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_admins (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL UNIQUE,
  name        TEXT,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION normalize_platform_admin_email()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.email := lower(trim(NEW.email));
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_normalize_platform_admin_email ON platform_admins;
CREATE TRIGGER trg_normalize_platform_admin_email
BEFORE INSERT OR UPDATE OF email ON platform_admins
FOR EACH ROW EXECUTE FUNCTION normalize_platform_admin_email();

-- Backfill from the legacy is_super_admin flag.
INSERT INTO platform_admins (user_id, email, name)
SELECT DISTINCT ON (lower(trim(email))) user_id, lower(trim(email)), name
FROM businesses_staff
WHERE is_super_admin = TRUE AND email IS NOT NULL
ORDER BY lower(trim(email)), user_id NULLS LAST
ON CONFLICT (email) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. Business lifecycle & configuration columns
-- ----------------------------------------------------------------------------
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS status             TEXT NOT NULL DEFAULT 'active';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS display_pin_hash   TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS sms_from_number    TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS ai_greeting        TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS business_hours     JSONB;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS menu_published_at  TIMESTAMPTZ;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS suspended_at       TIMESTAMPTZ;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS activated_at       TIMESTAMPTZ;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'businesses_status_check') THEN
    ALTER TABLE businesses ADD CONSTRAINT businesses_status_check
      CHECK (status IN ('draft', 'invited', 'active', 'suspended'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'businesses_plan_check') THEN
    ALTER TABLE businesses ADD CONSTRAINT businesses_plan_check
      CHECK (plan IN ('starter', 'growth', 'pro'));
  END IF;
END $$;

-- Derive initial status from the legacy is_active flag.
UPDATE businesses SET status = CASE WHEN is_active THEN 'active' ELSE 'suspended' END
WHERE status = 'active' AND is_active = FALSE;

-- Keep is_active in sync so older code paths keep working.
CREATE OR REPLACE FUNCTION sync_business_is_active()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.is_active := (NEW.status = 'active');
  NEW.updated_at := NOW();
  IF NEW.status = 'suspended' AND (OLD.status IS DISTINCT FROM 'suspended') THEN
    NEW.suspended_at := NOW();
  END IF;
  IF NEW.status = 'active' AND (OLD.status IS DISTINCT FROM 'active') THEN
    NEW.activated_at := COALESCE(NEW.activated_at, NOW());
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_sync_business_is_active ON businesses;
CREATE TRIGGER trg_sync_business_is_active
BEFORE INSERT OR UPDATE ON businesses
FOR EACH ROW EXECUTE FUNCTION sync_business_is_active();

-- ----------------------------------------------------------------------------
-- 3. Staff membership lifecycle
-- ----------------------------------------------------------------------------
ALTER TABLE businesses_staff ADD COLUMN IF NOT EXISTS status       TEXT NOT NULL DEFAULT 'invited';
ALTER TABLE businesses_staff ADD COLUMN IF NOT EXISTS invited_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE businesses_staff ADD COLUMN IF NOT EXISTS invited_at   TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE businesses_staff ADD COLUMN IF NOT EXISTS accepted_at  TIMESTAMPTZ;
ALTER TABLE businesses_staff ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'businesses_staff_role_check') THEN
    ALTER TABLE businesses_staff ADD CONSTRAINT businesses_staff_role_check
      CHECK (role IN ('owner', 'manager', 'staff'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'businesses_staff_status_check') THEN
    ALTER TABLE businesses_staff ADD CONSTRAINT businesses_staff_status_check
      CHECK (status IN ('invited', 'active', 'disabled'));
  END IF;
END $$;

UPDATE businesses_staff SET status = 'active', accepted_at = COALESCE(accepted_at, created_at)
WHERE user_id IS NOT NULL AND status = 'invited';

-- When a user id is linked, the membership becomes active.
CREATE OR REPLACE FUNCTION activate_staff_on_link()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND OLD.user_id IS NULL AND NEW.status = 'invited' THEN
    NEW.status := 'active';
    NEW.accepted_at := NOW();
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_activate_staff_on_link ON businesses_staff;
CREATE TRIGGER trg_activate_staff_on_link
BEFORE UPDATE ON businesses_staff
FOR EACH ROW EXECUTE FUNCTION activate_staff_on_link();

-- ----------------------------------------------------------------------------
-- 4. Orders: lifecycle timestamps, per-business order numbers, events
-- ----------------------------------------------------------------------------
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name      TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal           NUMERIC(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total              NUMERIC(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS currency           TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS accepted_at        TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS ready_at           TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS completed_at       TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notified_received  BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notified_ready     BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS source_ref         TEXT;   -- generic external id (vapi call id, etc.)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_status_check') THEN
    ALTER TABLE orders ADD CONSTRAINT orders_status_check
      CHECK (status IN ('pending', 'making', 'ready', 'done', 'cancelled'));
  END IF;
END $$;

-- Per-business order numbering. order_number was a global SERIAL in the
-- portal migration; this trigger assigns the next number per business when
-- the inserting client does not provide one.
CREATE OR REPLACE FUNCTION assign_order_number()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  next_number INT;
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = 0 THEN
    SELECT COALESCE(MAX(order_number), 0) + 1 INTO next_number
    FROM orders WHERE business_id = NEW.business_id;
    NEW.order_number := next_number;
  END IF;
  RETURN NEW;
END; $$;

-- Drop the SERIAL default so the trigger owns numbering.
ALTER TABLE orders ALTER COLUMN order_number DROP DEFAULT;
ALTER TABLE orders ALTER COLUMN order_number DROP NOT NULL;

DROP TRIGGER IF EXISTS trg_assign_order_number ON orders;
CREATE TRIGGER trg_assign_order_number
BEFORE INSERT ON orders
FOR EACH ROW EXECUTE FUNCTION assign_order_number();

CREATE UNIQUE INDEX IF NOT EXISTS uniq_orders_business_number ON orders (business_id, order_number);
CREATE INDEX IF NOT EXISTS idx_orders_business_status ON orders (business_id, status);

CREATE TABLE IF NOT EXISTS order_events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  business_id    UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  from_status    TEXT,
  to_status      TEXT NOT NULL,
  actor_type     TEXT NOT NULL CHECK (actor_type IN ('staff', 'display', 'platform_admin', 'system')),
  actor_user_id  UUID,
  actor_email    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_order_events_order ON order_events (order_id, created_at);
CREATE INDEX IF NOT EXISTS idx_order_events_business ON order_events (business_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 5. Operational tables
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action         TEXT NOT NULL,
  actor_type     TEXT NOT NULL,
  actor_user_id  UUID,
  actor_email    TEXT,
  business_id    UUID REFERENCES businesses(id) ON DELETE SET NULL,
  target_type    TEXT,
  target_id      TEXT,
  metadata       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_business ON audit_logs (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs (created_at DESC);

CREATE TABLE IF NOT EXISTS sms_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  order_id      UUID REFERENCES orders(id) ON DELETE SET NULL,
  to_number     TEXT NOT NULL,
  from_number   TEXT,
  kind          TEXT NOT NULL,
  body          TEXT NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('queued', 'sent', 'failed', 'skipped')),
  provider_id   TEXT,
  error         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sms_messages_business ON sms_messages (business_id, created_at DESC);

CREATE TABLE IF NOT EXISTS webhook_events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider       TEXT NOT NULL,                -- 'vapi' | 'telnyx' | ...
  event_type     TEXT,
  external_id    TEXT,                         -- e.g. vapi call id
  business_id    UUID REFERENCES businesses(id) ON DELETE SET NULL,
  payload        JSONB NOT NULL,
  status         TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processed', 'ignored', 'failed')),
  error          TEXT,
  order_id       UUID REFERENCES orders(id) ON DELETE SET NULL,
  received_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at   TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_webhook_events_provider_external
  ON webhook_events (provider, external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events (status, received_at DESC);

-- ----------------------------------------------------------------------------
-- 6. Row Level Security
--    The browser only ever READS with the anon key. All writes go through
--    server routes using the service role after authorisation.
-- ----------------------------------------------------------------------------

-- Helper avoids the recursive policy on businesses_staff.
CREATE OR REPLACE FUNCTION current_user_business_ids()
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT business_id FROM businesses_staff
  WHERE user_id = auth.uid() AND status <> 'disabled';
$$;

CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid());
$$;

ALTER TABLE businesses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders           ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_admins  ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_messages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events   ENABLE ROW LEVEL SECURITY;

-- Drop legacy policies (including the recursive one and the browser UPDATE grants).
DROP POLICY IF EXISTS staff_read_own_business        ON businesses;
DROP POLICY IF EXISTS staff_update_own_business      ON businesses;
DROP POLICY IF EXISTS staff_read_own_business_staff  ON businesses_staff;
DROP POLICY IF EXISTS staff_update_own_row           ON businesses_staff;
DROP POLICY IF EXISTS staff_read_own_orders          ON orders;
DROP POLICY IF EXISTS staff_update_own_orders        ON orders;

DROP POLICY IF EXISTS members_read_business          ON businesses;
DROP POLICY IF EXISTS members_read_staff             ON businesses_staff;
DROP POLICY IF EXISTS members_read_orders            ON orders;
DROP POLICY IF EXISTS members_read_order_events      ON order_events;
DROP POLICY IF EXISTS members_read_audit             ON audit_logs;
DROP POLICY IF EXISTS admins_read_platform_admins    ON platform_admins;

CREATE POLICY members_read_business ON businesses FOR SELECT
  USING (is_platform_admin() OR id IN (SELECT current_user_business_ids()));

CREATE POLICY members_read_staff ON businesses_staff FOR SELECT
  USING (is_platform_admin() OR business_id IN (SELECT current_user_business_ids()));

CREATE POLICY members_read_orders ON orders FOR SELECT
  USING (is_platform_admin() OR business_id IN (SELECT current_user_business_ids()));

CREATE POLICY members_read_order_events ON order_events FOR SELECT
  USING (is_platform_admin() OR business_id IN (SELECT current_user_business_ids()));

CREATE POLICY members_read_audit ON audit_logs FOR SELECT
  USING (is_platform_admin() OR business_id IN (SELECT current_user_business_ids()));

CREATE POLICY admins_read_platform_admins ON platform_admins FOR SELECT
  USING (is_platform_admin());

-- sms_messages / webhook_events: service role only (no policies => no anon access).

-- ----------------------------------------------------------------------------
-- 7. Realtime: kitchen display subscribes to order inserts/updates.
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE orders;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not add orders to supabase_realtime publication: %', SQLERRM;
END $$;
