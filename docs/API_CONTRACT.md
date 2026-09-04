# API Contract

Two things write orders into Supabase, and they do not talk to each other:

1. **This Next.js app** (`app/api/*`) — the staff/admin portal, the kitchen display, and a legacy
   single-tenant ingest fallback.
2. **The voice backend** (`backend/main.py`, FastAPI) — receives Vapi webhooks and writes orders
   **directly to Supabase** with the service-role key. It never calls this app's API.

Keeping that split straight is the most important thing to know before changing either side.

## 1. Next.js API (`app/api/*`)

All routes return JSON. Routes built on the newer session/permission model (see
`lib/auth/guards.ts`) return `{ ok: true, ...data }` or `{ ok: false, error: string }` via
`apiError()`. A few older routes (the legacy `/api/orders` GET/POST, `/api/orders/[orderId]`,
`/api/display/[slug]/*`) predate that helper and return `{ ok: false, message: string }` instead —
same shape, different key. Check `res.ok`, not just the JSON body, when calling them from a client.

### Session-scoped (staff/admin portal)

| Route | Auth | Notes |
|---|---|---|
| `GET/POST /api/admin/admins`, `DELETE /api/admin/admins/[adminId]` | platform admin | Manage platform-admin grants. |
| `GET/POST /api/admin/businesses/[businessId]`, `PATCH .../status` | platform admin | Business record, plan, telephony, status. |
| `GET/POST /api/admin/businesses/[businessId]/staff`, `.../staff/[staffId]` | platform admin | Team management as platform admin — see `lib/staff-mutations.ts`. |
| `POST /api/admin/onboard` | platform admin | Creates a business, invites the owner, optionally seeds a menu. |
| `POST /api/admin/resend-invite` | platform admin | Resends a staff invite. |
| `GET /api/admin/view-business` | platform admin | Sets the "viewing as business" cookie and redirects into `/business`. |
| `GET/PATCH /api/business` | business member (`settings.view`/`settings.edit`/`display.manage_pin`) | Reads/updates the caller's **active** business — resolved from the session, never a client-supplied ID. |
| `GET/POST /api/business/staff`, `.../staff/[staffId]` | business member (`staff.view`/`staff.invite`/`staff.manage_roles`/`staff.remove`) | Same mutation layer as the admin staff routes (`lib/staff-mutations.ts`), scoped to `session.activeBusinessId`. |
| `PUT /api/business/menu` | business member (`menu.edit`) | Saves the menu for the active business and best-effort pushes a regenerated system prompt to the Vapi assistant if one is configured. |
| `POST /api/menu/extract` | any session with `menu.edit` in some business | Vision-extracts a menu photo into `{categories}` via OpenAI. Stateless — does not touch a specific business. |
| `GET /api/auth/me`, `POST /api/auth/switch-business`, `POST /api/auth/accept-invite` | session | Auth/session plumbing used by the portal shell and invite flow. |

### Kitchen display (`/display/[slug]`)

| Route | Auth | Notes |
|---|---|---|
| `POST /api/display/[slug]/verify-pin` | business display PIN (or none, if unset) | Verifies the PIN via `lib/kds-token.ts#verifyPin` (hashed, timing-safe; falls back to legacy plaintext only for pre-migration rows) and returns a 30-day signed display token. |
| `POST /api/display/[slug]/request-pin-reset` | owner/manager email on file | Sends a magic-link sign-in email; always returns `{ok:true}` regardless of whether the email matched, to avoid leaking who has access. |
| `GET /api/orders?slug=<slug>` | staff session **or** `x-kds-token` header | Active orders for one business. |
| `PATCH /api/orders/[orderId]?slug=<slug>` | staff session **or** `x-kds-token` header | Advance/cancel one order; sends the "ready" SMS via Telnyx if configured. |

### Legacy single-tenant ingest (unauthenticated by nature — gated by a secret)

| Route | Auth | Notes |
|---|---|---|
| `GET /api/orders` (no `slug`) | `x-ingest-secret: ORDERFLOW_INGEST_SECRET` | Active orders for the single business named by `ORDERFLOW_BUSINESS_ID`. |
| `POST /api/orders` | `x-ingest-secret: ORDERFLOW_INGEST_SECRET` | Creates an order against `ORDERFLOW_BUSINESS_ID`. |

These two predate the multi-tenant session model and have no concept of "which business" beyond
the single `ORDERFLOW_BUSINESS_ID` env var. Nothing in this codebase calls them — **the voice
backend does not use them** (see below) — so unless you have an external integration pointed at
them, `ORDERFLOW_INGEST_SECRET` can be left unset and the routes simply return `503`. If you do set
it, every request must send it. Prefer the slugged, session/token-scoped routes above for anything
new.

### Public

| Route | Auth | Notes |
|---|---|---|
| `POST /api/demo-request` | none | Marketing-site lead form (`components/marketing/demo-request-dialog.tsx`). Rows land in `demo_requests`, visible at `/admin/demo-requests`. |
| `GET /api/health/db` | none | Liveness/config check used by the kitchen display's "connected" indicator (`?slug=`) and by uptime tooling (no `slug`). Deliberately unauthenticated so the display can poll it; it does not return secret values. |

## 2. Voice backend (`backend/main.py`)

A separate FastAPI service, deployed independently (Railway or similar), **not part of this
Next.js build**.

- `POST /webhook/vapi` — receives Vapi's `end-of-call-report` event, verifies `x-vapi-secret`
  against `VAPI_WEBHOOK_SECRET` (HMAC) when that env var is set, extracts order items from the
  call transcript via GPT-4o, and **inserts the order directly into Supabase** using
  `SUPABASE_SERVICE_ROLE_KEY` — it does not call any route in this app. Idempotent on
  `(business_id, vapi_call_id)`. Sends the initial confirmation SMS via Telnyx.
- `GET /health` — plain liveness check, `{"status": "ok"}`.

### The single-tenant gap

The backend resolves exactly one `BUSINESS_ID` at process startup, from `ORDERFLOW_BUSINESS_ID`
(stripping an optional `ID:` prefix) — it is not resolved per-call from the Vapi assistant ID or
any other per-request signal. Every order it inserts uses that one ID, regardless of which Vapi
assistant placed the call.

That is a real mismatch with the rest of the app: the admin console (`/admin/businesses/[slug]`,
Agent tab) lets you set a distinct `vapi_assistant_id` and `phone_number` per business, which
implies each business's calls route independently — but today, only the one business named by the
backend's `ORDERFLOW_BUSINESS_ID` actually receives orders from real phone calls. Configuring a
second business's assistant ID in the admin console does not connect it to anything on the backend
side.

**To make the voice backend genuinely multi-tenant**, the webhook handler needs to resolve
`business_id` per request — most naturally by looking up the business whose `vapi_assistant_id`
matches the assistant ID Vapi includes in the webhook payload, instead of reading a single ID from
the environment. That is a backend change (Python service, separate deploy) and is out of scope for
this pass; it's called out here so the gap is documented rather than silently assumed away. Until
then, treat this deployment as single-tenant for real phone-call ingestion, with the Next.js app's
multi-tenant model covering everything except the actual phone call.

## Response shape quick reference

```
// apiError()-based routes (most of /api/admin/*, /api/business, /api/business/staff, /api/business/menu, /api/menu/extract)
{ ok: true, ...data }
{ ok: false, error: "message" }

// Legacy routes (/api/orders, /api/orders/[orderId], /api/display/[slug]/*)
{ ok: true, ...data }
{ ok: false, message: "message", issues?: string[] }
```
