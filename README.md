# orderflow-ai

Kitchen display interface for live restaurant orders, built with Next.js and wired to Supabase through protected server-side API routes.

## Security changes

The app no longer accepts Supabase credentials in the browser or stores them in `localStorage`.

- Database access now runs on the server only.
- Order reads and writes go through `/api/orders`.
- `/api/health/db` validates environment setup and database reachability.
- Invalid status transitions are rejected on the server.
- Basic hardening headers are applied in `next.config.mjs`.

## Environment setup

Copy `.env.example` to `.env.local` and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
NEXT_PUBLIC_APP_URL=http://localhost:3000

SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ORDERFLOW_BUSINESS_ID=123e4567-e89b-12d3-a456-426614174000
```

`ORDERFLOW_BUSINESS_ID` must match the business whose active orders should be shown in the kitchen display.

## Getting started

```bash
pnpm install
pnpm dev
```

Then open `http://localhost:3000`.

If the environment is missing or invalid, the app shows a setup dialog with the exact configuration issues. You can still use demo mode without a database.

## Route map

For a full list of web interfaces and API endpoints, see `docs/ROUTES.md`.

## Handoff

If you are continuing the project, start with `docs/HANDOFF.md` and `docs/PROJECT_STRUCTURE.md`.
