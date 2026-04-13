-- ============================================================
-- Demo requests table
-- Stores public demo/contact submissions from the marketing site.
-- ============================================================

CREATE TABLE IF NOT EXISTS demo_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  business_name TEXT NOT NULL,
  phone         TEXT,
  message       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_demo_requests_created_at ON demo_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_demo_requests_email ON demo_requests (email);
