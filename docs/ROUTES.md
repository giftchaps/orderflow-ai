# Route Guide

This is the complete route map for the current portal and APIs.

## Web Interfaces

- /: Kitchen display board (public app shell)
- /login: Staff and admin sign-in
- /invite: Invitation acceptance (set password/profile)

### Admin Interfaces (super admin only)

- /admin/dashboard: Admin overview
- /admin/businesses: Business directory
- /admin/businesses/new: Onboard a new business

### Business Interfaces (owner/manager/staff)

- /business/dashboard: Business overview
- /business/orders: Live order workflow
- /business/menu: Menu management
- /business/staff: Staff management
- /business/settings: Business settings
- /business/analytics: Business analytics

## API Routes

### Authentication and diagnostics

- GET /api/auth/me: Resolve authenticated user and role
- GET /api/debug/config: Runtime config/deployment diagnostics
- GET /api/health/db: Database health check

### Admin actions

- POST /api/admin/onboard: Create business and invite owner

### Business actions

- GET /api/business: Get current business details
- POST /api/business/invite-staff: Invite manager/staff email
- GET /api/business/menu: Get business menu
- POST /api/business/menu: Save business menu

### Orders and extraction

- GET /api/orders: Fetch active orders
- POST /api/orders: Create incoming order
- PATCH /api/orders/[orderId]: Update order status/details
- POST /api/menu/extract: Extract structured menu data

## Access Rules (current behavior)

- Unauthenticated users trying to open /admin/* or /business/* are redirected to /login.
- Authenticated users are routed by role:
  - is_super_admin = true -> /admin/dashboard
  - non-admin with business access -> /business/dashboard
- /api/auth/me returns 401 when not authenticated and 403 when no staff role is found.

## Recommended primary entry links

- Admin: /admin/dashboard
- Business user: /business/dashboard
- New invited staff: /invite
