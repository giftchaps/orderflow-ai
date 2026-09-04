# OrderFlow AI Handoff

## Start here

If you're the next model (or person) picking this up:

- [docs/PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) — where things live, and the client/server `lib/` split
- [docs/ROUTES.md](ROUTES.md) — every route and its auth rule
- [docs/API_CONTRACT.md](API_CONTRACT.md) — API shapes, and the important Next.js-app-vs-voice-backend split
- [docs/CONTEXT.md](CONTEXT.md) — long-form background; written pre-multi-tenant, useful for history/intent, not current architecture

## Where the app is

The app went through a full migration from a single-tenant "one restaurant" model to multi-tenant
(businesses, staff roles, platform admins) — see `supabase/migrations/20260903000000_multi_tenant_platform.sql`
and `lib/auth/session.ts`/`lib/auth/permissions.ts` for the resulting session/permission model. That
migration is now complete and built out end-to-end:

### Auth & permissions
- Session model: `Session { user, isPlatformAdmin, memberships[], activeBusinessId, activeMembership, viewingAsAdmin }`.
- Role model: `owner > manager > staff` per business, with a `Permission` → minimum-role table (`lib/auth/permissions.ts`).
- Page guards (`requirePlatformAdmin`, `requireBusinessContext`) and API guards (`apiRequireSession`, `apiRequirePlatformAdmin`, `apiRequireBusiness`) in `lib/auth/guards.ts`.
- Every mutation writes an audit row via `lib/audit.ts`, visible at `/admin/businesses/[slug]` (Activity tab) and `/admin` (recent activity).

### Admin console (`/admin/*`)
- Overview, business directory, business detail (overview/agent/team/display/account/activity tabs), all orders, demo requests.
- Platform-admin management (`/admin/admins`) and a live system-health page (`/admin/system`) — both new this pass.

### Business portal (`/business/*`)
- Dashboard, orders, analytics, settings (profile + display PIN), and — as of this pass — menu and
  team management rebuilt on the same server-validated model as the admin side (they previously
  used a client-side Supabase pattern that bypassed the permission system).

### Kitchen display (`/display/[slug]`)
- Signed 30-day display tokens (`lib/kds-token.ts`), PIN-gated if the business has a PIN set.
  PIN verification was fixed this pass to actually check the hashed PIN column instead of a
  plaintext column nothing writes to anymore (see "Fixed this pass" below).

### Marketing site (`/`)
- Public homepage with a demo-request dialog wired to `/api/demo-request`, visible to admins at
  `/admin/demo-requests`.

## Fixed this pass

Starting point was v0.app's own 6-step plan for finishing the multi-tenant migration (steps 1–2
were done, step 3 partial). Working from that plan plus a direct read of the codebase:

1. **Finished the incomplete migration** (earlier fix, already on `main`): split `lib/orders.ts`,
   `lib/business.ts`, and `lib/platform.ts` into client-safe (`-shared`/plain) and server-only
   (`-server`/`server-only`-tagged) modules to satisfy the RSC boundary; removed the last
   references to the deleted `getUserRole()`/`resolve-user-role` helpers; migrated every remaining
   page and API route onto `requireBusinessContext()`/`apiRequireBusiness()`.
2. **Admin admins-management page** (`/admin/admins`) and **system-health page** (`/admin/system`) —
   the API routes existed, the UI didn't.
3. **Business staff page** (`/business/staff`) rewritten as a server component on
   `requireBusinessContext("staff.view")` + the shared `TeamManager` component, with new
   session-scoped API routes (`/api/business/staff[/[staffId]]`) built on the same
   `lib/staff-mutations.ts` the admin side uses. The old client-side-Supabase page and its
   `/api/business/invite-staff` route are gone.
4. **Business menu page** (`/business/menu`) rewritten the same way: server component fetches the
   business via `requireBusinessContext`, a client `MenuManager` does the editing, `PUT
   /api/business/menu` now resolves the business from the session instead of trusting a
   client-supplied `business_id`.
5. **Hardened the legacy order-ingest fallback**: `GET/POST /api/orders` without a `?slug=` had no
   auth at all. It's now gated by `ORDERFLOW_INGEST_SECRET` (`lib/ingest-auth.ts`) — unset means
   the route returns `503` rather than being open to the internet.
6. **Fixed kitchen-display PIN verification**: `/api/display/[slug]/verify-pin` was still comparing
   against the legacy plaintext `display_pin` column with `!==`. The settings UI has written the
   hashed `display_pin_hash` column exclusively for a while now (`lib/business-mutations.ts`), so
   any business that set a PIN after that migration could never actually unlock its display — the
   check now uses `lib/kds-token.ts#verifyPin` (checks the hash first, timing-safe, falls back to
   legacy plaintext only for rows that predate the hash column).
7. **Fixed a broken landing route**: sign-in, the sidebar's "Overview" link, and the business
   switcher all pointed to bare `/business`, but no `app/(business)/business/page.tsx` existed —
   only `/business/dashboard` did, so every business user landed on a 404 right after signing in.
   Added a redirect page.
8. **Wired up the marketing site's demo-request form**: `/api/demo-request` and the admin view of
   submissions already worked, but every "Book a demo" / "Request access" button on the homepage
   was a static, non-functional `<Button>` with no handler, and the email input in the closing CTA
   didn't submit anywhere. Added `components/marketing/demo-request-dialog.tsx` and wired all four
   entry points (nav, mobile nav, hero, closing CTA) to it.
9. **Documented, rather than silently papered over, the real multi-tenant gap in the voice
   backend**: `backend/main.py` (a separate FastAPI service) writes orders straight to Supabase
   using a single hardcoded `ORDERFLOW_BUSINESS_ID` — it doesn't call this app's API, and doesn't
   resolve the business per call from the Vapi assistant ID. That means the per-business
   `vapi_assistant_id` field in the admin console is currently informational for any business
   other than the one the backend is configured for. Fixing that is a backend (Python) change,
   out of scope here — see `docs/API_CONTRACT.md` for the full writeup and the recommended fix
   (resolve `business_id` from the assistant ID on each webhook call).

## Current URLs

- `/` — marketing homepage
- `/login`, `/invite`, `/reset-password`, `/no-access` — auth flows
- `/admin` — platform-admin console (`/admin/businesses`, `/admin/businesses/new`,
  `/admin/businesses/[slug]`, `/admin/orders`, `/admin/demo-requests`, `/admin/admins`, `/admin/system`)
- `/business` (redirects to `/business/dashboard`) — business portal (`/business/orders`,
  `/business/menu`, `/business/staff`, `/business/analytics`, `/business/settings`)
- `/display/[slug]` — kitchen display

## Deployments

- GitHub repo: `https://github.com/giftchaps/orderflow-ai.git`
- Production custom domain: `https://www.orderflowai.app`
- Vercel production should point to the latest `main` branch commit
- Voice backend (`backend/main.py`) deploys separately (Railway or similar) — not part of the
  Vercel/Next.js build

## Environment variables

Frontend/Vercel (public):
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`

Server (Next.js — see `lib/env.ts` for the validated schema):
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — required
- `ORDERFLOW_INGEST_SECRET` — required only to enable the legacy `/api/orders` fallback; leave unset otherwise
- `KDS_TOKEN_SECRET` — signs display tokens/PIN hashes; falls back to the service-role key if unset
- `OPENAI_API_KEY` — menu photo extraction
- `VAPI_API_KEY` — pushes regenerated system prompts to Vapi assistants when the menu is saved
- `TELNYX_API_KEY`, `TELNYX_FROM_NUMBER` — outbound SMS
- `BACKEND_URL` — informational; the voice backend doesn't call back into this app
- `ORDERFLOW_BUSINESS_ID` — legacy single-tenant fallback, do not rely on it for anything new

Voice backend (`backend/main.py`, separate deploy — see its own `_REQUIRED` list):
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `ORDERFLOW_BUSINESS_ID`,
  `TELNYX_API_KEY`, `TELNYX_FROM_NUMBER`; optional `ORDERFLOW_BUSINESS_NAME`, `ORDERFLOW_BUSINESS_PHONE`, `VAPI_WEBHOOK_SECRET`

`/admin/system` shows live status for all of the Next.js-side integrations above.

## Database migrations

- `20260411000000_portal_schema.sql`
- `20260412000000_staff_email_guards.sql`
- `20260412000002_demo_requests.sql`
- `20260504000000_display_pin.sql`
- `20260902000000_orders_vapi_call_id.sql`
- `20260903000000_multi_tenant_platform.sql` — the multi-tenant migration (businesses/staff/roles/audit_logs/platform_admins)

## Safe next work

- Make the voice backend resolve `business_id` per call from the Vapi assistant ID, instead of one
  hardcoded `ORDERFLOW_BUSINESS_ID` — see `docs/API_CONTRACT.md`. This is the biggest remaining
  gap between what the admin console promises (per-business phone agents) and what actually happens.
- Consider whether `GET /api/health/db` (no `slug`) should require auth — it's unauthenticated by
  design so the kitchen display can poll it, and doesn't leak secret values, but it does list
  config-issue field names to anyone who asks.
- `docs/CONTEXT.md` is pre-multi-tenant and increasingly misleading as project history vs. current
  architecture; consider trimming it or folding its still-relevant parts into this file.
