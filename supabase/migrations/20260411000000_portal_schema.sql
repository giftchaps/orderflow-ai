-- ============================================================
-- Portal schema migration
-- Creates businesses and businesses_staff tables from scratch,
-- or adds missing columns if they already exist.
-- Run this in the Supabase SQL Editor.
-- ============================================================

-- -------------------------------------------------------
-- businesses table
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS businesses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  
  slug                TEXT UNIQUE,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  plan                TEXT NOT NULL DEFAULT 'starter',
  owner_email         TEXT,
  timezone            TEXT NOT NULL DEFAULT 'America/New_York',
  address             TEXT,
  prep_time_minutes   INT NOT NULL DEFAULT 15,
  phone_number        TEXT,
  vapi_assistant_id   TEXT,
  menu                JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add any columns that may be missing if the table already existed
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS slug               TEXT UNIQUE;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS is_active          BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS plan               TEXT NOT NULL DEFAULT 'starter';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS owner_email        TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS timezone           TEXT NOT NULL DEFAULT 'America/New_York';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS address            TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS prep_time_minutes  INT NOT NULL DEFAULT 15;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS phone_number       TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS vapi_assistant_id  TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS menu               JSONB;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- -------------------------------------------------------
-- businesses_staff table
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS businesses_staff (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email           TEXT,
  name            TEXT,
  role            TEXT NOT NULL DEFAULT 'staff',
  is_super_admin  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add any columns that may be missing if the table already existed
ALTER TABLE businesses_staff ADD COLUMN IF NOT EXISTS name           TEXT;
ALTER TABLE businesses_staff ADD COLUMN IF NOT EXISTS email          TEXT;
ALTER TABLE businesses_staff ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- -------------------------------------------------------
-- orders table (if not already created)
-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS orders (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id           UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  order_number          SERIAL,
  status                TEXT NOT NULL DEFAULT 'pending',
  channel               TEXT NOT NULL DEFAULT 'phone',
  customer_phone        TEXT,
  items                 JSONB,
  special_instructions  TEXT,
  raw_transcript        TEXT,
  placed_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- Indexes
-- -------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_businesses_slug             ON businesses (slug);
CREATE INDEX IF NOT EXISTS idx_businesses_is_active        ON businesses (is_active);
CREATE INDEX IF NOT EXISTS idx_businesses_staff_email      ON businesses_staff (email);
CREATE INDEX IF NOT EXISTS idx_businesses_staff_business   ON businesses_staff (business_id);
CREATE INDEX IF NOT EXISTS idx_businesses_staff_user       ON businesses_staff (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_business_id          ON orders (business_id);
CREATE INDEX IF NOT EXISTS idx_orders_placed_at            ON orders (placed_at DESC);

-- -------------------------------------------------------
-- Row Level Security
-- -------------------------------------------------------

ALTER TABLE businesses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders           ENABLE ROW LEVEL SECURITY;

-- businesses: staff can read their own business
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'staff_read_own_business' AND tablename = 'businesses') THEN
    CREATE POLICY "staff_read_own_business" ON businesses FOR SELECT
      USING (id IN (SELECT business_id FROM businesses_staff WHERE user_id = auth.uid()));
  END IF;
END $$;

-- businesses: owner/manager can update their own business
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'staff_update_own_business' AND tablename = 'businesses') THEN
    CREATE POLICY "staff_update_own_business" ON businesses FOR UPDATE
      USING (id IN (SELECT business_id FROM businesses_staff WHERE user_id = auth.uid() AND role IN ('owner', 'manager')));
  END IF;
END $$;

-- businesses_staff: staff can read all members of their own business
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'staff_read_own_business_staff' AND tablename = 'businesses_staff') THEN
    CREATE POLICY "staff_read_own_business_staff" ON businesses_staff FOR SELECT
      USING (business_id IN (SELECT business_id FROM businesses_staff WHERE user_id = auth.uid()));
  END IF;
END $$;

-- businesses_staff: staff can update their own row (set name after invite)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'staff_update_own_row' AND tablename = 'businesses_staff') THEN
    CREATE POLICY "staff_update_own_row" ON businesses_staff FOR UPDATE
      USING (user_id = auth.uid());
  END IF;
END $$;

-- orders: staff can read orders for their business
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'staff_read_own_orders' AND tablename = 'orders') THEN
    CREATE POLICY "staff_read_own_orders" ON orders FOR SELECT
      USING (business_id IN (SELECT business_id FROM businesses_staff WHERE user_id = auth.uid()));
  END IF;
END $$;

-- orders: staff can update orders for their business (e.g. change status)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'staff_update_own_orders' AND tablename = 'orders') THEN
    CREATE POLICY "staff_update_own_orders" ON orders FOR UPDATE
      USING (business_id IN (SELECT business_id FROM businesses_staff WHERE user_id = auth.uid()));
  END IF;
END $$;
