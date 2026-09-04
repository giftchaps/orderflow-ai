# Route Guide

Complete route map for the multi-tenant app. See [docs/API_CONTRACT.md](API_CONTRACT.md) for
request/response shapes and auth details on every API route.

## Web Interfaces

- `/` — marketing homepage (`(marketing)` route group)
- `/login` — sign in
- `/invite` — accept a staff/admin invite
- `/reset-password` — password reset
- `/no-access` — shown to an authenticated user with no platform-admin role and no business membership
- `/auth/continue` — post-auth redirect helper (routes to `/admin` or `/business` based on session)
- `/display/[slug]` — kitchen display board for one business (PIN-gated if the business has a display PIN set)

### Admin console (platform admin only — `(admin)` route group, guarded by `requirePlatformAdmin()`)

- `/admin` — overview: stats, businesses needing attention, recent activity
- `/admin/businesses` — business directory
- `/admin/businesses/new` — onboard a new business
- `/admin/businesses/[slug]` — business detail (tabs: overview, agent, team, display, account, activity)
- `/admin/orders` — all orders across every business
- `/admin/demo-requests` — leads submitted through the marketing site's demo-request form
- `/admin/admins` — manage platform-admin grants
- `/admin/system` — integration/health status (Supabase, Vapi, OpenAI, Telnyx, ingest secret, KDS token secret)
- `/admin/dashboard` — legacy path, redirects to `/admin`

### Business portal (owner/manager/staff — `(business)` route group, guarded by `requireBusinessContext()`)

- `/business` — redirects to `/business/dashboard` (this is the landing path used by login, the sidebar, and the business switcher)
- `/business/dashboard` — overview
- `/business/orders` — live order workflow (`orders.view`)
- `/business/menu` — menu management (`menu.view`; edits require `menu.edit`)
- `/business/staff` — team management (`staff.view`; invites require `staff.invite`, role/removal require `staff.manage_roles`/`staff.remove`)
- `/business/analytics` — analytics (`analytics.view`)
- `/business/settings` — business profile, kitchen display link, display PIN (`settings.view`; edits require `settings.edit`)

A platform admin can open any business portal "as the business" via `/api/admin/view-business` —
see the sidebar's "Platform" section and `lib/auth/session.ts`'s `viewingAsAdmin` flag.

## API Routes

See [docs/API_CONTRACT.md](API_CONTRACT.md) for the full table (auth requirements, response
shapes, and the legacy-route quirks). Summary by area:

- **Auth**: `/api/auth/me`, `/api/auth/switch-business`, `/api/auth/accept-invite`
- **Admin**: `/api/admin/admins[/[adminId]]`, `/api/admin/businesses/[businessId]`, `.../status`, `.../staff[/[staffId]]`, `/api/admin/onboard`, `/api/admin/resend-invite`, `/api/admin/view-business`
- **Business (session-scoped, resolved from `session.activeBusinessId`)**: `/api/business`, `/api/business/staff[/[staffId]]`, `/api/business/menu`, `/api/menu/extract`
- **Orders / kitchen display**: `/api/orders` (session or `x-kds-token`, with a secret-gated legacy fallback), `/api/orders/[orderId]`
- **Display auth**: `/api/display/[slug]/verify-pin`, `/api/display/[slug]/request-pin-reset`
- **Public**: `/api/demo-request`, `/api/health/db`

## Access Rules (current behavior)

- Unauthenticated users opening `/admin/*` or `/business/*` are redirected to `/login`.
- `requirePlatformAdmin()` redirects non-admins away from `/admin/*` to `/business`.
- `requireBusinessContext(permission?)` redirects a session with no active business membership to
  `/admin/businesses` (platform admins) or `/no-access` (everyone else), and redirects to
  `/business?denied=1` if the caller lacks the required permission.
- `defaultLandingPath()` (`lib/auth/session.ts`) sends a freshly authenticated user to `/business`
  if they have an active business membership, otherwise to `/admin` if they're a platform admin,
  otherwise to `/no-access`.
- Platform admins bypass business-role permission checks everywhere (`canInBusiness()` /
  `requireBusinessContext().can()` always return `true` for them).

## Invite Email Requirement

- The Supabase Auth Site URL must be the production app URL, not `localhost`.
- Several invite-sending routes (`/api/admin/onboard`, staff invite routes) explicitly reject
  sending an invite if `NEXT_PUBLIC_APP_URL` still resolves to `localhost` while running in a
  production Vercel environment, rather than silently emailing a broken link.

## Recommended primary entry links

- Platform admin: `/admin`
- Business user: `/business` (redirects to `/business/dashboard`)
- Newly invited staff/admin: `/invite`
- Kitchen: `/display/<business-slug>`
