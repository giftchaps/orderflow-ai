# Project Structure

This project is split by purpose so routes and features are easy to find.

## Top-Level Areas

- `app/` — Next.js App Router routes and route groups
- `components/` — shared UI and feature components
- `lib/` — server/client utilities and domain helpers
- `docs/` — project context, route map, API contract, handoff notes
- `supabase/` — schema and migration files
- `backend/` — separate FastAPI service for the Vapi voice webhook (writes to Supabase directly; see `docs/API_CONTRACT.md`)

## Route Groups in `app/`

- `(marketing)` — public homepage (`/`), warm-cream theme scoped via its own layout
- `(auth)` — `/login`, `/invite`, `/reset-password`, `/no-access`, `/auth/continue`
- `(admin)` — platform-admin console (`/admin/*`), guarded by `requirePlatformAdmin()`
- `(business)` — business portal (`/business/*`), guarded by `requireBusinessContext()`
- `(public)` — `/display/[slug]`, the kitchen display board

## `lib/` — server vs. client-safe module boundary

Next.js's RSC boundary means any module reachable from a `"use client"` component's import graph
must not import `server-only` code, even transitively. Three domains are split accordingly:

| Domain | Client-safe (types, constants, pure helpers) | Server-only (DB reads/writes) |
|---|---|---|
| Orders | `lib/orders.ts` | `lib/orders-server.ts` |
| Business | `lib/business-shared.ts` | `lib/business.ts` (re-exports the shared module, adds `fetchBusiness`/`fetchStaff`) |
| Platform | `lib/platform-shared.ts` | `lib/platform.ts` (re-exports the shared module, adds the Supabase-backed list/stat functions) |

Components under a `"use client"` ancestor (forms, panels, the team manager, the menu editor)
import from the `-shared`/non-server module. Server components and API routes import from the
plain (server) module, which re-exports everything the shared module has plus the DB functions.

Other notable `lib/` files:

- `lib/auth/session.ts` — `Session`/`Membership` types, `getSession()`, `canInBusiness()`, `defaultLandingPath()`
- `lib/auth/guards.ts` — page guards (`requirePlatformAdmin`, `requireBusinessContext`) and API guards (`apiRequireSession`, `apiRequirePlatformAdmin`, `apiRequireBusiness`, `apiError`/`ApiError`)
- `lib/auth/permissions.ts` — `BusinessRole`, `Permission`, `PERMISSION_MIN_ROLE`, `can()`, `assignableRoles()`
- `lib/staff-mutations.ts` — shared invite/update/remove logic used by both the admin and business staff API routes
- `lib/business-mutations.ts` — business profile/PIN/platform-field mutations, used by `/api/business` and the admin business routes
- `lib/kds-token.ts` — signed display tokens and hashed PIN verification (`hashPin`/`verifyPin`/`hasPin`)
- `lib/ingest-auth.ts` — guards the legacy single-tenant `/api/orders` fallback with `ORDERFLOW_INGEST_SECRET`
- `lib/audit.ts` — `logAudit()`, the append-only `audit_logs` writer used across admin/business mutations
- `lib/env.ts` — validated server env (`getServerEnv`, `getServerEnvIssues`, `getIntegrationStatus`)
- `lib/api-client.ts` — tiny `api()` fetch wrapper for the `{ok:true,...}`/`{ok:false,error}` route contract

## Feature Folders

- `components/kds/` — kitchen display system UI pieces
- `components/marketing/` — homepage lead-capture (`demo-request-dialog.tsx`)
- `components/portal/` — shared portal chrome: sidebar, page header, status badges, team manager, empty state, display settings
- `components/admin/` — admin-only views: business table, business-detail tabs/panels, admins manager, audit feed
- `components/business/` — business-portal views: settings form, staff panel, menu manager
- `components/ui/` — shadcn/ui design-system primitives

## Important Docs

- [docs/HANDOFF.md](HANDOFF.md) — what's done and where to start next
- [docs/ROUTES.md](ROUTES.md) — every route/interface URL and its auth rule
- [docs/API_CONTRACT.md](API_CONTRACT.md) — API request/response shapes, and the Next.js app vs. voice-backend split
- [docs/CONTEXT.md](CONTEXT.md) — long-form project background (pre-multi-tenant; useful for history, not current architecture)
