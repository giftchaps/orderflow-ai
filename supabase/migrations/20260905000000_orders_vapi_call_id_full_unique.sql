-- The previous unique index on (business_id, vapi_call_id) was PARTIAL
-- ("WHERE vapi_call_id IS NOT NULL"). Postgres will not use a partial index
-- as an ON CONFLICT target unless the INSERT statement's own ON CONFLICT
-- clause repeats that exact WHERE predicate — and PostgREST's on_conflict=
-- query parameter (what supabase-py's .upsert(..., on_conflict=...) sends)
-- has no way to express that. Every real phone order was failing at the
-- final insert with: "there is no unique or exclusion constraint matching
-- the ON CONFLICT specification" (Postgres error 42P10) — the order was
-- never written, which is why nothing appeared on the dashboard after a
-- live test call even once the API keys were fixed.
--
-- Postgres unique indexes already treat NULL as distinct from any other
-- value, so multiple orders with no vapi_call_id (manual/web orders, or
-- calls where Vapi didn't send one) can coexist under a plain, non-partial
-- unique index too — the WHERE clause was never actually necessary.
DROP INDEX IF EXISTS idx_orders_vapi_call_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_vapi_call_id
  ON orders (business_id, vapi_call_id);

NOTIFY pgrst, 'reload schema';
