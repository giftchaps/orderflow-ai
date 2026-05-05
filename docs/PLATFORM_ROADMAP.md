# OrderFlow AI Platform Roadmap

This document is the working build plan for turning the pilot into a full multi-tenant ordering platform.

## Product Goal

OrderFlow AI should let a platform administrator onboard a food business, configure its AI ordering agent, publish its menu, invite its team, monitor live orders, and diagnose issues without editing database rows or asking engineering to manually patch production.

The system should support three main user groups:

- **OrderFlow system administrators:** ResurgeX/operator users who manage the whole platform.
- **Business administrators:** restaurant owners and managers who manage their own location.
- **Kitchen staff:** users or PIN-authorized displays that move orders through the kitchen workflow.

## Core Operating Model

Every production feature must be business-scoped unless it is explicitly platform-level.

- Platform data belongs to OrderFlow AI.
- Business data belongs to one business tenant.
- Staff permissions are resolved through `businesses_staff`.
- Kitchen display access is handled by display PIN/token, not by public slug alone.
- All important actions create audit or event records.

## Primary Interfaces

### Super Admin Dashboard

The super admin dashboard should become the control room for the platform.

Required views:

- Platform overview: active businesses, today orders, failed webhooks, failed SMS, pending invites.
- Business directory: status, plan, owner, phone number, agent status, last order, last menu publish.
- New business onboarding.
- Demo requests/leads.
- System administrators.
- Platform logs and incidents.
- Integration health: Supabase, Vercel, Railway backend, Vapi, SMS provider, OpenAI.

Required actions:

- Create/edit/suspend/reactivate businesses.
- Change business owner email.
- Resend owner or staff invites.
- Impersonate/view business dashboard as admin.
- Reset kitchen display PIN.
- Assign Vapi assistant and phone number.
- Publish/regenerate AI system prompt.
- Review failed events and retry safe actions.

### Business Onboarding

Onboarding should be a guided workflow, not just a form.

Steps:

1. Business profile: name, slug, address, timezone, hours, prep time, plan.
2. Owner account: owner name/email, invite status, optional secondary manager.
3. Menu setup: upload menu image/PDF, review extracted items, confirm categories/prices/options.
4. AI agent setup: phone number, Vapi assistant id, greeting, pickup instructions, guardrails.
5. Kitchen setup: display URL, display PIN, printer/display preference.
6. SMS setup: from number, customer confirmation copy, ready message copy.
7. Review and launch: run test order, verify order appears, verify staff can update status.

Completion states:

- Draft
- Invited
- Configured
- Test passed
- Live
- Suspended

### Business Dashboard

Business users need an operational dashboard.

Required cards:

- Orders today
- Orders this week
- Average prep time
- Active orders
- AI agent status
- SMS status
- Menu publish status

Required sections:

- Recent orders
- Problem events: failed SMS, failed extraction, missed webhook, invalid menu item
- Quick links: kitchen display, menu manager, staff, settings

### Kitchen Display

The display is an operational tool and should be fast, clear, and touch-friendly.

Required behavior:

- PIN gate issues a display token.
- Status updates require staff auth or display token.
- Forgot PIN asks for an owner/manager email and sends a secure settings link only for allowed business users.
- Orders move through New -> Making -> Ready -> Done.
- New orders alert visually and audibly.
- Display shows connection status and last refresh/realtime event.
- Display recovers gracefully from network failure.
- All status changes create order events.

### Menu Manager

The menu is the brain of the AI agent.

Required features:

- Upload image/PDF and extract menu.
- Manual category/item editor.
- Item aliases.
- Prices by size/bread.
- Modifier groups: bread, wrap type, cheese, toppings, add-ons, removals.
- Availability/sold-out toggle.
- Day/time availability.
- Version history.
- Publish to AI agent.
- Test prompt/extraction with sample customer phrasing.

### Staff and Access

Required features:

- Invite owner, manager, staff.
- Resend invite.
- Change role.
- Disable/remove staff.
- Show pending/accepted invite status.
- Super admin can change owner email and send new invite.
- Business owner/manager can invite staff for their own business.

## Backend and Data Model

Current core tables:

- `businesses`
- `businesses_staff`
- `orders`
- `demo_requests`

Recommended platform tables:

- `business_invites`: invite lifecycle, email, role, status, sent_by, accepted_at.
- `order_events`: immutable timeline for every order.
- `audit_logs`: platform/business administrative actions.
- `integration_logs`: Vapi/OpenAI/SMS/webhook calls and failures.
- `sms_messages`: customer SMS records and delivery status.
- `webhook_events`: raw inbound webhook records and processing status.
- `menu_versions`: published menu snapshots.
- `system_admins`: platform administrator roles if not represented by staff rows.

## Logging Rules

Log these as first-class events:

- Business created/updated/suspended.
- Owner email changed.
- Invite sent/resent/accepted/failed.
- Menu uploaded/extracted/published.
- Vapi prompt updated/failed.
- Order created.
- Order status changed.
- SMS queued/sent/failed.
- Webhook received/processed/failed.
- Kitchen display token used for status change.

## Build Phases

### Phase 1: Stabilize Provenzano's Pilot

- Fix kitchen display token auth.
- Verify Accept/Making/Ready/Done works from `/display/provenzanos-deli`.
- Ensure active order reads and writes are business-scoped by slug/business id.
- Confirm received and ready SMS behavior.
- Add order event logging.

### Phase 2: Real Admin Operations

- Expand business details page into a full admin profile.
- Add owner email change and resend invite flow.
- Add staff management from super admin.
- Add business status/plan controls.
- Add demo requests admin view.

### Phase 3: Onboarding System

- Convert onboarding into saved draft workflow.
- Add launch checklist.
- Add integration health checks per business.
- Add menu review/publish step.
- Add test call/test order verification.

### Phase 4: Analytics and Monitoring

- Platform analytics dashboard.
- Business analytics dashboard.
- Integration logs and retry tools.
- Order timelines.
- Export/reporting basics.

### Phase 5: Scale-Ready Multi-Tenant Platform

- Remove production reliance on `ORDERFLOW_BUSINESS_ID`.
- Add menu versioning.
- Add invite lifecycle table.
- Add system admin role model.
- Harden RLS and server action boundaries.
- Add automated smoke tests for core flows.

## Development Discipline

Each meaningful feature should include:

- A scoped implementation.
- Database migration when schema changes.
- UI state for loading/error/success.
- Audit/event logging where relevant.
- Typecheck before commit.
- A short note in the relevant doc if behavior changes.

Commits should represent stable milestones that can be deployed to Vercel/Railway.
