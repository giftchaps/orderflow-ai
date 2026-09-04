import "server-only"

import { cache } from "react"
import { cookies } from "next/headers"
import type { User } from "@supabase/supabase-js"
import { createAuthClient } from "@/lib/supabase/auth-server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { normalizeEmail } from "@/lib/auth/normalize-email"
import { can, isBusinessRole, type BusinessRole, type Permission } from "@/lib/auth/permissions"

/** Cookie holding the business a multi-business user is currently working in. */
export const ACTIVE_BUSINESS_COOKIE = "of_business"
/** Cookie set when a platform admin opens a business portal "as the business". */
export const ADMIN_VIEW_COOKIE = "of_admin_view"

export type BusinessStatus = "draft" | "invited" | "active" | "suspended"
export type MembershipStatus = "invited" | "active" | "disabled"

export type Membership = {
  staffId: string
  businessId: string
  businessName: string
  businessSlug: string | null
  businessStatus: BusinessStatus
  role: BusinessRole
  status: MembershipStatus
}

export type Session = {
  user: { id: string; email: string | null }
  isPlatformAdmin: boolean
  memberships: Membership[]
  /** Business currently in context for /business/* routes (may be admin-view). */
  activeBusinessId: string | null
  activeMembership: Membership | null
  /** True when a platform admin is viewing a business they are not a member of. */
  viewingAsAdmin: boolean
}

type StaffRow = {
  id: string
  business_id: string
  user_id: string | null
  email: string | null
  role: string
  status: string | null
  is_super_admin: boolean | null
  businesses: { id: string; name: string; slug: string | null; status: string | null; is_active: boolean | null } | null
}

function deriveBusinessStatus(row: { status: string | null; is_active: boolean | null }): BusinessStatus {
  if (row.status === "draft" || row.status === "invited" || row.status === "active" || row.status === "suspended") {
    return row.status
  }
  return row.is_active === false ? "suspended" : "active"
}

function deriveMembershipStatus(row: { status: string | null; user_id: string | null }): MembershipStatus {
  if (row.status === "invited" || row.status === "active" || row.status === "disabled") return row.status
  return row.user_id ? "active" : "invited"
}

async function isPlatformAdminUser(user: User): Promise<boolean> {
  const admin = createSupabaseServerClient()
  const email = normalizeEmail(user.email)

  // Preferred: dedicated platform_admins table.
  const byTable = await admin
    .from("platform_admins")
    .select("id, user_id, email")
    .or(`user_id.eq.${user.id}${email ? `,email.eq.${email}` : ""}`)
    .limit(1)
    .maybeSingle()

  if (!byTable.error) {
    if (byTable.data) {
      if (!byTable.data.user_id) {
        await admin.from("platform_admins").update({ user_id: user.id }).eq("id", byTable.data.id)
      }
      return true
    }
    return false
  }

  // Fallback while the migration has not been applied: legacy flag on businesses_staff.
  const legacy = await admin
    .from("businesses_staff")
    .select("id")
    .eq("is_super_admin", true)
    .or(`user_id.eq.${user.id}${email ? `,email.eq.${email}` : ""}`)
    .limit(1)
    .maybeSingle()

  return Boolean(legacy.data)
}

async function loadMemberships(user: User): Promise<Membership[]> {
  const admin = createSupabaseServerClient()
  const email = normalizeEmail(user.email)

  // Link any pending invites for this email to the user id (first login after invite).
  if (email) {
    await admin
      .from("businesses_staff")
      .update({ user_id: user.id, email })
      .is("user_id", null)
      .ilike("email", email)
  }

  const { data, error } = await admin
    .from("businesses_staff")
    .select(
      "id, business_id, user_id, email, role, status, is_super_admin, businesses(id, name, slug, status, is_active)"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })

  if (error) throw new Error(error.message)

  const rows = (data ?? []) as unknown as StaffRow[]

  return rows
    .filter((row) => row.businesses && isBusinessRole(row.role))
    .map((row) => ({
      staffId: row.id,
      businessId: row.business_id,
      businessName: row.businesses!.name,
      businessSlug: row.businesses!.slug,
      businessStatus: deriveBusinessStatus(row.businesses!),
      role: row.role as BusinessRole,
      status: deriveMembershipStatus(row),
    }))
    .filter((m) => m.status !== "disabled")
}

async function loadAdminViewMembership(businessId: string): Promise<Membership | null> {
  const admin = createSupabaseServerClient()
  const { data } = await admin
    .from("businesses")
    .select("id, name, slug, status, is_active")
    .eq("id", businessId)
    .maybeSingle()
  if (!data) return null
  return {
    staffId: "platform-admin",
    businessId: data.id,
    businessName: data.name,
    businessSlug: data.slug,
    businessStatus: deriveBusinessStatus(data),
    role: "owner",
    status: "active",
  }
}

/**
 * Resolve the full session for the current request. Cached per request.
 * Returns null when unauthenticated.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const supabase = await createAuthClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  return buildSession(user)
})

/** Build a session for a verified Supabase user (used by /api/auth/me with bearer tokens). */
export async function buildSession(user: User): Promise<Session> {
  const [isPlatformAdmin, memberships] = await Promise.all([isPlatformAdminUser(user), loadMemberships(user)])

  const cookieStore = await cookies()
  const preferred = cookieStore.get(ACTIVE_BUSINESS_COOKIE)?.value ?? null
  const adminView = cookieStore.get(ADMIN_VIEW_COOKIE)?.value ?? null

  let activeMembership: Membership | null = null
  let viewingAsAdmin = false

  if (preferred) {
    activeMembership = memberships.find((m) => m.businessId === preferred) ?? null
  }
  if (!activeMembership && memberships.length > 0) {
    activeMembership = memberships[0]
  }
  if (!activeMembership && isPlatformAdmin && adminView) {
    activeMembership = await loadAdminViewMembership(adminView)
    viewingAsAdmin = Boolean(activeMembership)
  } else if (isPlatformAdmin && adminView && activeMembership?.businessId !== adminView) {
    // Admin explicitly chose to view a business; that wins over their own memberships.
    const view = await loadAdminViewMembership(adminView)
    if (view) {
      activeMembership = view
      viewingAsAdmin = true
    }
  }

  return {
    user: { id: user.id, email: user.email ?? null },
    isPlatformAdmin,
    memberships,
    activeBusinessId: activeMembership?.businessId ?? null,
    activeMembership,
    viewingAsAdmin,
  }
}

/** Where a freshly authenticated user should land. */
export function defaultLandingPath(session: Session): string {
  if (session.isPlatformAdmin && session.memberships.length === 0) return "/admin"
  if (session.activeMembership) return "/business"
  if (session.isPlatformAdmin) return "/admin"
  return "/no-access"
}

/** Whether the session may act on a business with the given permission. */
export function canInBusiness(session: Session, businessId: string, permission: Permission): boolean {
  if (session.isPlatformAdmin) return true
  const membership = session.memberships.find((m) => m.businessId === businessId)
  return can(membership?.role, permission)
}

export function membershipFor(session: Session, businessId: string): Membership | null {
  return session.memberships.find((m) => m.businessId === businessId) ?? null
}
