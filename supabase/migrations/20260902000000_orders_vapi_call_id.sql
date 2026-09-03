-- Add vapi_call_id to orders for webhook idempotency.
-- A unique constraint on (business_id, vapi_call_id) ensures a retried Vapi
-- webhook for the same call can never create a duplicate order.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS vapi_call_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_vapi_call_id
  ON orders (business_id, vapi_call_id)
  WHERE vapi_call_id IS NOT NULL;
