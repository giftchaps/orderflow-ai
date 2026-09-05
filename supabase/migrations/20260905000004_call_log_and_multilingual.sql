-- Phase 1 of the feature-roadmap feasibility study: multilingual mode and a
-- real call log, both picked because they reuse infrastructure that already
-- exists (the Vapi end-of-call webhook, the webhook_events table) rather
-- than needing anything new.

-- Opt-in per business. Off by default so no existing assistant's behavior
-- changes without a deliberate choice — turning it on also switches that
-- assistant's transcriber (see lib/vapi-prompt.ts), which is worth testing
-- per business rather than flipping for everyone at once.
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS multilingual BOOLEAN NOT NULL DEFAULT false;

-- webhook_events already exists (added in 20260903000000_multi_tenant_platform.sql)
-- as exactly the right place to record "a call happened," but nothing has
-- ever written to it -- every call that didn't become an order left zero
-- trace anywhere. These columns give it a proper call-log shape without
-- losing the original payload (still kept in full in the `payload` column).
ALTER TABLE webhook_events
  ADD COLUMN IF NOT EXISTS caller_number TEXT,
  ADD COLUMN IF NOT EXISTS transcript TEXT,
  ADD COLUMN IF NOT EXISTS recording_url TEXT,
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS ended_reason TEXT,
  ADD COLUMN IF NOT EXISTS summary TEXT;

CREATE INDEX IF NOT EXISTS idx_webhook_events_business_received
  ON webhook_events (business_id, received_at DESC);
