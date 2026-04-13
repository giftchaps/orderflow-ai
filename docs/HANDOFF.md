# OrderFlow AI Handoff

## Start Here

If you are the next model taking over, begin with these files:

- [docs/CONTEXT.md](docs/CONTEXT.md)
- [docs/ROUTES.md](docs/ROUTES.md)
- [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md)
- [app/(marketing)/page.tsx](app/(marketing)/page.tsx)
- [app/(auth)/login/page.tsx](app/(auth)/login/page.tsx)
- [app/api/admin/onboard/route.ts](app/api/admin/onboard/route.ts)
- [app/api/business/invite-staff/route.ts](app/api/business/invite-staff/route.ts)
- [app/api/demo-request/route.ts](app/api/demo-request/route.ts)
- [supabase/migrations/20260412000000_staff_email_guards.sql](supabase/migrations/20260412000000_staff_email_guards.sql)
- [supabase/migrations/20260412000002_demo_requests.sql](supabase/migrations/20260412000002_demo_requests.sql)

## What Has Been Accomplished

### Public site and app split
- Root domain now serves a marketing homepage.
- Login, invite, admin, business, and display remain separate routes.
- Kitchen display now lives under a dedicated display route group.

### Auth and login hardening
- Login now uses Supabase password auth plus server-side role lookup.
- `/api/auth/me` supports bearer token lookup.
- Duplicate staff rows no longer break login role resolution.
- Production invite URLs are blocked if they try to use localhost.

### Business onboarding
- Admin onboarding creates a business and invites the owner.
- Missing admin business details route was added.
- Duplicate onboarding submissions for the same owner/name pair are blocked.
- Invite outcome is explicit: invite sent, existing account, or warning.

### Data integrity
- Staff email migration normalizes emails and prevents duplicates.
- Demo requests table added for marketing leads.
- Demo request submissions are saved to Supabase.

### Marketing site
- Public homepage now shows product value, workflow, pricing, and CTAs.
- Demo request form is embedded on the homepage.
- Site metadata was updated to reflect OrderFlow AI branding.

## Current URLs

- `/` = marketing homepage
- `/login` = sign in
- `/invite` = accept an invite
- `/admin/dashboard` = admin dashboard
- `/admin/businesses` = business directory
- `/admin/businesses/new` = onboard a business
- `/business/dashboard` = business dashboard
- `/business/orders` = orders workflow
- `/business/menu` = menu management
- `/business/staff` = staff management
- `/business/settings` = business settings
- `/business/analytics` = analytics
- `/display/[slug]` = kitchen display

## Deployments

- GitHub repo: `https://github.com/giftchaps/orderflow-ai.git`
- Production custom domain: `https://www.orderflowai.app`
- Vercel production should point to the latest `main` branch commit

## Environment Variables to Keep Consistent

Frontend/Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`

Server/Vercel/Railway:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ORDERFLOW_BUSINESS_ID`
- `ORDERFLOW_BUSINESS_NAME`
- `ORDERFLOW_BUSINESS_PHONE`

Backend/Railway:
- `OPENAI_API_KEY`
- `PORT`

## Database Migrations Already Added

- `20260412000000_staff_email_guards.sql`
- `20260412000002_demo_requests.sql`

## Key Commit Milestones

- `2190c87` marketing homepage launch polish
- `8f6d894` demo request form added
- `7ee3a63` split marketing homepage from kitchen display
- `d1e9116` block localhost invite URLs in production
- `866be20` clarify owner invite outcomes
- `50e3806` fix onboarding 404 and production invite redirect links
- `3a3eba0` prevent duplicate staff emails
- `3ef0579` handle duplicate staff rows in login role resolution
- `0bac21c` fix login staff lookup and add deployment diagnostics

## Safe Next Work

- Add admin view for demo requests.
- Add email notification for demo submissions.
- Move remaining docs into a single architecture index if desired.
- Add a production health check page for auth/site URL consistency.
