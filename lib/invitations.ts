import "server-only"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { normalizeEmail } from "@/lib/auth/normalize-email"
import type { BusinessRole } from "@/lib/auth/permissions"
import { getAppUrl } from "@/lib/env"

export type InviteResult = {
  staffId: string
  /** true when a Supabase Auth invite email was sent. */
  emailSent: boolean
  /** true when the user already had an auth account and was linked immediately. */
  linkedExisting: boolean
  warning?: string
}

/**
 * Create (or reuse) a staff row for `email` in `businessId` and send an invite.
 * Idempotent: re-inviting the same email returns the existing staff row.
 *
 * If the person already has a Supabase Auth account (e.g. they own another
 * business), we link the row to their user_id right away so they see the new
 * business in their switcher on next sign-in — no email needed.
 */
export async function inviteStaff(input: {
  businessId: string
  email: string
  name?: string | null
  role: BusinessRole
  invitedBy?: string | null
  origin?: string
}): Promise<InviteResult> {
  const supabase = createSupabaseServerClient()
  const email = normalizeEmail(input.email)
  if (!email) throw new Error("A valid email is required.")

  // 1. Upsert staff row
  const { data: existing } = await supabase
    .from("businesses_staff")
    .select("id, user_id, status")
    .eq("business_id", input.businessId)
    .eq("email", email)
    .maybeSingle()

  let staffId = existing?.id
  if (!staffId) {
    const { data: inserted, error } = await supabase
      .from("businesses_staff")
      .insert({
        business_id: input.businessId,
        email,
        name: input.name ?? null,
        role: input.role,
        status: "invited",
        invited_by: input.invitedBy ?? null,
        invited_at: new Date().toISOString(),
      })
      .select("id")
      .single()
    if (error || !inserted) throw new Error(error?.message ?? "Failed to create staff record.")
    staffId = inserted.id
  } else if (existing?.status === "disabled") {
    await supabase.from("businesses_staff").update({ status: "invited", role: input.role }).eq("id", staffId)
  }

  // 2. Does an auth user already exist for this email?
  const existingUser = await findAuthUserByEmail(email)
  if (existingUser) {
    await supabase
      .from("businesses_staff")
      .update({ user_id: existingUser.id, status: "active", accepted_at: new Date().toISOString() })
      .eq("id", staffId)
    return {
      staffId,
      emailSent: false,
      linkedExisting: true,
      warning: `${email} already has an OrderFlow account and was added directly. They can switch to this business after signing in.`,
    }
  }

  // 3. Send the Supabase invite email
  const appUrl = getAppUrl(input.origin)
  if (process.env.VERCEL_ENV === "production" && appUrl.includes("localhost")) {
    throw new Error("NEXT_PUBLIC_APP_URL points to localhost in production. Fix the env var before sending invites.")
  }

  const { error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${appUrl}/invite`,
    data: { business_id: input.businessId, role: input.role, name: input.name ?? "" },
  })

  if (inviteErr) {
    const msg = inviteErr.message.toLowerCase()
    if (msg.includes("already") && (msg.includes("registered") || msg.includes("exists") || msg.includes("confirmed"))) {
      // Race: user was created between lookup and invite. Try linking again.
      const user = await findAuthUserByEmail(email)
      if (user) {
        await supabase.from("businesses_staff").update({ user_id: user.id, status: "active" }).eq("id", staffId)
        return { staffId, emailSent: false, linkedExisting: true, warning: "Account already existed; linked directly." }
      }
      return {
        staffId,
        emailSent: false,
        linkedExisting: false,
        warning: "This email already has an account. Ask them to sign in; the business will appear once linked.",
      }
    }
    throw new Error(`Invite email failed: ${inviteErr.message}`)
  }

  return { staffId, emailSent: true, linkedExisting: false }
}

/** Resend the invite for an existing pending staff row. */
export async function resendInvite(staffId: string, origin?: string): Promise<InviteResult> {
  const supabase = createSupabaseServerClient()
  const { data: staff, error } = await supabase
    .from("businesses_staff")
    .select("id, business_id, email, name, role, user_id")
    .eq("id", staffId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!staff || !staff.email) throw new Error("Staff record not found.")
  if (staff.user_id) {
    return { staffId, emailSent: false, linkedExisting: true, warning: "This person has already activated their account." }
  }
  return inviteStaff({
    businessId: staff.business_id,
    email: staff.email,
    name: staff.name,
    role: staff.role as BusinessRole,
    origin,
  })
}

/**
 * Supabase Admin API has no direct "get user by email"; page through users.
 * Fine for the platform's scale; replace with a `profiles` lookup if it grows.
 */
export async function findAuthUserByEmail(email: string): Promise<{ id: string } | null> {
  const supabase = createSupabaseServerClient()
  const target = normalizeEmail(email)
  let page = 1
  // Cap the search to avoid unbounded loops on very large auth tables.
  while (page <= 20) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
    if (error || !data?.users?.length) return null
    const found = data.users.find((u) => normalizeEmail(u.email) === target)
    if (found) return { id: found.id }
    if (data.users.length < 200) return null
    page += 1
  }
  return null
}
