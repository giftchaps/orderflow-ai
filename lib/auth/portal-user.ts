import "server-only"

import type { Session } from "@/lib/auth/session"
import { PERMISSION_MIN_ROLE, can, type Permission } from "@/lib/auth/permissions"
import type { PortalUser } from "@/components/portal/types"

/** Convert the server session into the minimal, serialisable shape the client shell needs. */
export function toPortalUser(session: Session): PortalUser {
  const active = session.activeMembership
  const allPermissions = Object.keys(PERMISSION_MIN_ROLE) as Permission[]
  const permissions =
    session.isPlatformAdmin || session.viewingAsAdmin
      ? allPermissions
      : allPermissions.filter((p) => can(active?.role, p))

  return {
    email: session.user.email,
    isPlatformAdmin: session.isPlatformAdmin,
    memberships: session.memberships.map((m) => ({
      businessId: m.businessId,
      businessName: m.businessName,
      businessSlug: m.businessSlug,
      businessStatus: m.businessStatus,
      role: m.role,
      status: m.status,
    })),
    activeBusinessId: active?.businessId ?? null,
    activeBusinessName: active?.businessName ?? null,
    activeBusinessSlug: active?.businessSlug ?? null,
    activeRole: active?.role ?? null,
    viewingAsAdmin: session.viewingAsAdmin,
    permissions,
  }
}
