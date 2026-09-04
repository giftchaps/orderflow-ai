import "server-only"

import { z } from "zod"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { ApiError } from "@/lib/auth/guards"
import { assignableRoles, BUSINESS_ROLES, type BusinessRole } from "@/lib/auth/permissions"
import type { Session } from "@/lib/auth/session"
import { inviteStaff, resendInvite } from "@/lib/invitations"
import { logAudit } from "@/lib/audit"

export const inviteStaffSchema = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().max(120).optional().or(z.literal("")),
  role: z.enum(BUSINESS_ROLES as [BusinessRole, ...BusinessRole[]]),
})

export const updateStaffSchema = z.object({
  role: z.enum(BUSINESS_ROLES as [BusinessRole, ...BusinessRole[]]).optional(),
  status: z.enum(["active", "disabled"]).optional(),
  name: z.string().trim().max(120).optional(),
})

/** Who is acting: platform admins can do anything; business users are bounded by their role. */
type Actor = { session: Session; role: BusinessRole | "platform_admin" }

export async function inviteTeamMember(actor: Actor, businessId: string, input: z.infer<typeof inviteStaffSchema>, origin?: string) {
  if (actor.role !== "platform_admin" && !assignableRoles(actor.role).includes(input.role)) {
    throw new ApiError(403, `Your role cannot invite a ${input.role}.`)
  }
  if (input.role === "owner" && actor.role !== "platform_admin") {
    throw new ApiError(403, "Only platform administrators can assign the owner role.")
  }

  const result = await inviteStaff({
    businessId,
    email: input.email,
    name: input.name || null,
    role: input.role,
    invitedBy: actor.session.user.id,
    origin,
  })

  await logAudit({
    action: "staff.invited",
    session: actor.session,
    businessId,
    targetType: "staff",
    targetId: result.staffId,
    metadata: { email: input.email.toLowerCase(), role: input.role, emailSent: result.emailSent },
  })
  return result
}

export async function resendTeamInvite(actor: Actor, businessId: string, staffId: string, origin?: string) {
  const staff = await getStaffInBusiness(businessId, staffId)
  const result = await resendInvite(staffId, origin)
  await logAudit({
    action: "staff.invite_resent",
    session: actor.session,
    businessId,
    targetType: "staff",
    targetId: staffId,
    metadata: { email: staff.email },
  })
  return result
}

export async function updateTeamMember(actor: Actor, businessId: string, staffId: string, input: z.infer<typeof updateStaffSchema>) {
  const staff = await getStaffInBusiness(businessId, staffId)
  const updates: Record<string, unknown> = {}

  if (input.role && input.role !== staff.role) {
    if (actor.role !== "platform_admin") {
      if (!assignableRoles(actor.role).includes(input.role)) throw new ApiError(403, `Your role cannot assign ${input.role}.`)
      if (staff.role === "owner") throw new ApiError(403, "Only platform administrators can change the owner.")
      if (staff.user_id === actor.session.user.id) throw new ApiError(400, "You cannot change your own role.")
    }
    if (staff.role === "owner" && input.role !== "owner") await ensureAnotherOwner(businessId, staffId)
    updates.role = input.role
  }

  if (input.status && input.status !== staff.status) {
    if (staff.user_id === actor.session.user.id) throw new ApiError(400, "You cannot disable your own account.")
    if (staff.role === "owner" && input.status === "disabled") await ensureAnotherOwner(businessId, staffId)
    updates.status = input.status
  }

  if (typeof input.name === "string") updates.name = input.name

  if (Object.keys(updates).length === 0) throw new ApiError(400, "No changes provided.")

  const supabase = createSupabaseServerClient()
  const { error } = await supabase.from("businesses_staff").update(updates).eq("id", staffId).eq("business_id", businessId)
  if (error) throw new ApiError(500, error.message)

  await logAudit({
    action: updates.role ? "staff.role_changed" : "staff.removed",
    session: actor.session,
    businessId,
    targetType: "staff",
    targetId: staffId,
    metadata: { email: staff.email, ...updates },
  })
}

export async function removeTeamMember(actor: Actor, businessId: string, staffId: string) {
  const staff = await getStaffInBusiness(businessId, staffId)
  if (staff.user_id === actor.session.user.id) throw new ApiError(400, "You cannot remove yourself.")
  if (staff.role === "owner") {
    if (actor.role !== "platform_admin") throw new ApiError(403, "Only platform administrators can remove an owner.")
    await ensureAnotherOwner(businessId, staffId)
  }

  const supabase = createSupabaseServerClient()
  const { error } = await supabase.from("businesses_staff").delete().eq("id", staffId).eq("business_id", businessId)
  if (error) throw new ApiError(500, error.message)

  await logAudit({
    action: "staff.removed",
    session: actor.session,
    businessId,
    targetType: "staff",
    targetId: staffId,
    metadata: { email: staff.email, role: staff.role },
  })
}

// ---------------------------------------------------------------------------

async function getStaffInBusiness(businessId: string, staffId: string) {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from("businesses_staff")
    .select("id, business_id, user_id, email, role, status")
    .eq("id", staffId)
    .eq("business_id", businessId)
    .maybeSingle()
  if (error) throw new ApiError(500, error.message)
  if (!data) throw new ApiError(404, "Team member not found in this business.")
  return data as { id: string; business_id: string; user_id: string | null; email: string | null; role: BusinessRole; status: string | null }
}

async function ensureAnotherOwner(businessId: string, excludingStaffId: string) {
  const supabase = createSupabaseServerClient()
  const { count } = await supabase
    .from("businesses_staff")
    .select("*", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("role", "owner")
    .neq("id", excludingStaffId)
  if (!count) throw new ApiError(409, "A business must keep at least one owner. Assign another owner first.")
}
