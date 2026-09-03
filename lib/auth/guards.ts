import "server-only"

import { redirect } from "next/navigation"
import { NextResponse } from "next/server"
import { getSession, type Membership, type Session } from "@/lib/auth/session"
import { can, type Permission } from "@/lib/auth/permissions"

// ---------------------------------------------------------------------------
// Page guards (redirect)
// ---------------------------------------------------------------------------

export async function requirePlatformAdmin(): Promise<Session> {
  const session = await getSession()
  if (!session) redirect("/login?next=/admin")
  if (!session.isPlatformAdmin) redirect("/business")
  return session
}

export type BusinessContext = {
  session: Session
  membership: Membership
  businessId: string
  /** Effective role (platform admins viewing a business act as owner). */
  role: Membership["role"]
  can: (permission: Permission) => boolean
}

export async function requireBusinessContext(permission?: Permission): Promise<BusinessContext> {
  const session = await getSession()
  if (!session) redirect("/login?next=/business")

  const membership = session.activeMembership
  if (!membership) {
    redirect(session.isPlatformAdmin ? "/admin/businesses" : "/no-access")
  }

  const ctx: BusinessContext = {
    session,
    membership,
    businessId: membership.businessId,
    role: membership.role,
    can: (p) => session.viewingAsAdmin || session.isPlatformAdmin ? true : can(membership.role, p),
  }

  if (permission && !ctx.can(permission)) {
    redirect("/business?denied=1")
  }

  return ctx
}

// ---------------------------------------------------------------------------
// API guards (JSON responses)
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function apiError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ ok: false, error: error.message }, { status: error.status })
  }
  const message = error instanceof Error ? error.message : "Unexpected error."
  return NextResponse.json({ ok: false, error: message }, { status: 500 })
}

export async function apiRequireSession(): Promise<Session> {
  const session = await getSession()
  if (!session) throw new ApiError(401, "Not authenticated.")
  return session
}

export async function apiRequirePlatformAdmin(): Promise<Session> {
  const session = await apiRequireSession()
  if (!session.isPlatformAdmin) throw new ApiError(403, "Platform administrator access required.")
  return session
}

/**
 * Authorise an API call against a specific business.
 * Platform admins pass automatically. Business users need an active membership with the permission.
 */
export async function apiRequireBusiness(businessId: string, permission: Permission): Promise<{
  session: Session
  role: Membership["role"]
}> {
  const session = await apiRequireSession()
  if (session.isPlatformAdmin) return { session, role: "owner" }

  const membership = session.memberships.find((m) => m.businessId === businessId)
  if (!membership) throw new ApiError(403, "You do not belong to this business.")
  if (!can(membership.role, permission)) throw new ApiError(403, "Your role does not allow this action.")
  return { session, role: membership.role }
}
