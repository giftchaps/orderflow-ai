-- ============================================================
-- Portal schema migration
-- Adds columns required for the SaaS portal to businesses
-- and businesses_staff tables.
-- Run this in the Supabase SQL Editor.
-- ============================================================

-- -------------------------------------------------------
-- businesses table
-- -------------------------------------------------------

-- Human-readable unique identifier used in URLs and kitchen display
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Whether the business account is active
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Subscription plan: starter | growth | pro
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'starter';

-- Email of the business owner (stored for reference/invites)
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS owner_email TEXT;

-- IANA timezone string e.g. "America/New_York"
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'America/New_York';

-- Street address
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS address TEXT;

-- Default prep time shown to customers
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS prep_time_minutes INT NOT NULL DEFAULT 15;

-- Twilio/Telnyx phone number assigned to this business
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Vapi voice assistant ID linked to this business
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS vapi_assistant_id TEXT;

-- Full menu stored as JSON
-- Structure: { categories: [{ id, name, items: [{ id, name, aliases, description, active, prices }] }] }
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS menu JSONB;

-- -------------------------------------------------------
-- businesses_staff table
-- -------------------------------------------------------

-- Display name for the staff member
ALTER TABLE businesses_staff
  ADD COLUMN IF NOT EXISTS name TEXT;

-- Email address (used for invites and display; may differ from auth email)
ALTER TABLE businesses_staff
  ADD COLUMN IF NOT EXISTS email TEXT;

-- Whether this staff member has super-admin access across all businesses
ALTER TABLE businesses_staff
  ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- -------------------------------------------------------
-- Indexes
-- -------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_businesses_slug ON businesses (slug);
CREATE INDEX IF NOT EXISTS idx_businesses_is_active ON businesses (is_active);
CREATE INDEX IF NOT EXISTS idx_businesses_staff_email ON businesses_staff (email);
CREATE INDEX IF NOT EXISTS idx_businesses_staff_business_id ON businesses_staff (business_id);

-- -------------------------------------------------------
-- Row Level Security policies
-- -------------------------------------------------------

-- Enable RLS on businesses if not already enabled
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses_staff ENABLE ROW LEVEL SECURITY;

-- Staff can read their own business
CREATE POLICY IF NOT EXISTS "staff_read_own_business"
  ON businesses FOR SELECT
  USING (
    id IN (
      SELECT business_id FROM businesses_staff
      WHERE user_id = auth.uid()
    )
  );

-- Staff can update their own business (name, address, prep_time, menu)
CREATE POLICY IF NOT EXISTS "staff_update_own_business"
  ON businesses FOR UPDATE
  USING (
    id IN (
      SELECT business_id FROM businesses_staff
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'manager')
    )
  );

-- Staff can read all staff in their own business
CREATE POLICY IF NOT EXISTS "staff_read_own_business_staff"
  ON businesses_staff FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM businesses_staff
      WHERE user_id = auth.uid()
    )
  );

-- Staff can update their own row (e.g. set their name after invite)
CREATE POLICY IF NOT EXISTS "staff_update_own_row"
  ON businesses_staff FOR UPDATE
  USING (user_id = auth.uid());
