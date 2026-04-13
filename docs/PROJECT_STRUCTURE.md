# Project Structure

This project is intentionally split by purpose so routes and features are easy to find.

## Top-Level Areas

- `app/` - Next.js routes and route groups
- `components/` - Shared UI and feature components
- `lib/` - Server/client utilities and domain helpers
- `docs/` - Project context, route map, handoff notes, structure docs
- `supabase/` - Schema and migration files
- `backend/` - FastAPI service for webhook ingestion and order extraction

## Route Groups in `app/`

- `(marketing)` - Public website landing page
- `(auth)` - Login and invite flows
- `(admin)` - Super-admin portal
- `(business)` - Business portal
- `(public)` - Public display route(s)

## Feature Folders

- `components/kds/` - kitchen display system UI pieces
- `components/marketing/` - homepage/lead-capture components
- `components/ui/` - design system primitives
- `lib/auth/` - role resolution, email normalization, auth helpers
- `lib/supabase/` - server/browser Supabase clients

## Important Docs

- [docs/HANDOFF.md](docs/HANDOFF.md) - What is done and where to start next
- [docs/ROUTES.md](docs/ROUTES.md) - Every route and interface URL
- [docs/CONTEXT.md](docs/CONTEXT.md) - Long-form project source of truth
