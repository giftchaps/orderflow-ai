import type { BusinessRole, Permission } from "@/lib/auth/permissions"
import type { BusinessStatus, MembershipStatus } from "@/lib/auth/session"

/** Serialisable slice of the server session that the portal shell needs. */
export type PortalMembership = {
  businessId: string
  businessName: string
  businessSlug: string | null
  businessStatus: BusinessStatus
  role: BusinessRole
  status: MembershipStatus
}

export type PortalUser = {
  email: string | null
  isPlatformAdmin: boolean
  memberships: PortalMembership[]
  activeBusinessId: string | null
  activeBusinessName: string | null
  activeBusinessSlug: string | null
  activeRole: BusinessRole | null
  viewingAsAdmin: boolean
  /** Permissions granted in the active business (already resolved server-side). */
  permissions: Permission[]
}
