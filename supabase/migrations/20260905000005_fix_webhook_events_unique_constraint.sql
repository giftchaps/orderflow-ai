-- The original webhook_events uniqueness (20260903000000_multi_tenant_platform.sql)
-- was a PARTIAL unique index: `WHERE external_id IS NOT NULL`. Postgres cannot
-- use a partial index to satisfy ON CONFLICT (provider, external_id) inference
-- unless the same WHERE predicate is repeated in the conflict clause — which
-- PostgREST's on_conflict= query param (used by the call-log upsert added in
-- 20260905000004) has no way to express. Every call-log write since that
-- feature shipped has been failing with:
--   "there is no unique or exclusion constraint matching the ON CONFLICT
--    specification" (Postgres code 42P10)
-- — silently, since the backend logs and swallows the error rather than
-- failing the call. A plain, non-partial unique constraint fixes this and is
-- safe to swap in: Postgres never treats two NULL external_id values as
-- conflicting in a unique constraint, so rows without an external_id behave
-- identically to before.
DROP INDEX IF EXISTS uniq_webhook_events_provider_external;

ALTER TABLE webhook_events
  ADD CONSTRAINT uniq_webhook_events_provider_external UNIQUE (provider, external_id);
