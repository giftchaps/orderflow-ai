import "server-only"

import { z } from "zod"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { normalizeEmail } from "@/lib/auth/normalize-email"
import { hashPin, PIN_RE } from "@/lib/kds-token"
import { logAudit } from "@/lib/audit"
import { ApiError } from "@/lib/auth/guards"
import type { Session } from "@/lib/auth/session"
import { PLANS, TIMEZONES } from "@/lib/business"

// ---------------------------------------------------------------------------
// Schemas — split by who may change what.
// ---------------------------------------------------------------------------

/** Fields a business owner/manager may change about their own business. */
export const businessProfileSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  address: z.string().trim().max(240).nullable().optional(),
  timezone: z.enum(TIMEZONES.map((t) => t.value) as [string, ...string[]]).optional(),
  prep_time_minutes: z.coerce.number().int().min(1).max(240).optional(),
  ai_greeting: z.string().trim().max(400).nullable().optional(),
  business_hours: z.record(z.string(), z.unknown()).nullable().optional(),
  theme_color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color like #d92626")
    .nullable()
    .optional(),
})

/** PIN update — separate because it is hashed and audited on its own. */
export const displayPinSchema = z.object({
  display_pin: z.string().regex(PIN_RE, "PIN must be 4-8 digits.").nullable(),
})

/** Platform-admin-only fields: plan, telephony, agent, owner. */
export const businessPlatformSchema = z.object({
  plan: z.enum(PLANS.map((p) => p.id) as [string, ...string[]]).optional(),
  phone_number: z.string().trim().max(32).nullable().optional(),
  sms_from_number: z.string().trim().max(32).nullable().optional(),
  vapi_assistant_id: z.string().trim().max(120).nullable().optional(),
  owner_email: z.string().trim().email().nullable().optional(),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/)
    .optional(),
})

export const businessStatusSchema = z.object({
  status: z.enum(["draft", "invited", "active", "suspended"]),
  reason: z.string().trim().max(240).optional(),
})

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function updateBusinessProfile(
  session: Session,
  businessId: string,
  input: z.infer<typeof businessProfileSchema>
) {
  const updates = stripUndefined(input)
  if (Object.keys(updates).length === 0) throw new ApiError(400, "No changes provided.")

  const supabase = createSupabaseServerClient()
  const { error } = await supabase.from("businesses").update(updates).eq("id", businessId)
  if (error) throw new ApiError(500, error.message)

  await logAudit({
    action: "business.updated",
    session,
    businessId,
    targetType: "business",
    targetId: businessId,
    metadata: { fields: Object.keys(updates) },
  })
  return updates
}

export async function updateDisplayPin(session: Session, businessId: string, pin: string | null) {
  const supabase = createSupabaseServerClient()
  const updates: Record<string, unknown> = {
    display_pin_hash: pin ? hashPin(businessId, pin) : null,
    display_pin: null, // always clear legacy plaintext
  }

  let { error } = await supabase.from("businesses").update(updates).eq("id", businessId)
  if (error && /display_pin_hash/.test(error.message)) {
    // Legacy DB without the hash column — fall back to plaintext so the feature still works,
    // but flag it so ops can run the migration.
    console.warn("[business] display_pin_hash column missing; storing plaintext PIN. Run migrations.")
    ;({ error } = await supabase.from("businesses").update({ display_pin: pin }).eq("id", businessId))
  }
  if (error) throw new ApiError(500, error.message)

  await logAudit({
    action: "business.pin_changed",
    session,
    businessId,
    targetType: "business",
    targetId: businessId,
    metadata: { cleared: pin === null },
  })
}

export async function updateBusinessPlatformFields(
  session: Session,
  businessId: string,
  input: z.infer<typeof businessPlatformSchema>
) {
  const supabase = createSupabaseServerClient()
  const updates = stripUndefined(input) as Record<string, unknown>

  if (typeof updates.owner_email === "string") updates.owner_email = normalizeEmail(updates.owner_email as string)

  if (typeof updates.slug === "string") {
    const { data: clash } = await supabase
      .from("businesses")
      .select("id")
      .eq("slug", updates.slug)
      .neq("id", businessId)
      .maybeSingle()
    if (clash) throw new ApiError(409, "That slug is already used by another business.")
  }

  if (Object.keys(updates).length === 0) throw new ApiError(400, "No changes provided.")

  const { error } = await supabase.from("businesses").update(updates).eq("id", businessId)
  if (error) throw new ApiError(500, error.message)

  // Keep the owner staff row in sync when owner_email changes.
  if (typeof updates.owner_email === "string") {
    await syncOwnerStaffRow(businessId, updates.owner_email as string)
    await logAudit({
      action: "business.owner_changed",
      session,
      businessId,
      targetType: "business",
      targetId: businessId,
      metadata: { email: updates.owner_email },
    })
  }

  const agentFields = ["phone_number", "sms_from_number", "vapi_assistant_id"].filter((f) => f in updates)
  if (agentFields.length > 0) {
    await logAudit({
      action: "business.agent_updated",
      session,
      businessId,
      targetType: "business",
      targetId: businessId,
      metadata: { fields: agentFields },
    })
  }

  const otherFields = Object.keys(updates).filter((f) => !agentFields.includes(f) && f !== "owner_email")
  if (otherFields.length > 0) {
    await logAudit({
      action: "business.updated",
      session,
      businessId,
      targetType: "business",
      targetId: businessId,
      metadata: { fields: otherFields },
    })
  }

  return updates
}

export async function setBusinessStatus(
  session: Session,
  businessId: string,
  status: z.infer<typeof businessStatusSchema>["status"],
  reason?: string
) {
  const supabase = createSupabaseServerClient()
  const { data: current, error: readErr } = await supabase
    .from("businesses")
    .select("status, is_active, name")
    .eq("id", businessId)
    .maybeSingle()
  if (readErr) throw new ApiError(500, readErr.message)
  if (!current) throw new ApiError(404, "Business not found.")

  const now = new Date().toISOString()
  const updates: Record<string, unknown> = { status, is_active: status === "active" }
  if (status === "suspended") updates.suspended_at = now
  if (status === "active") {
    updates.suspended_at = null
    updates.activated_at = now
  }

  let { error } = await supabase.from("businesses").update(updates).eq("id", businessId)
  if (error && /column/.test(error.message)) {
    // Legacy DB: only is_active exists.
    ;({ error } = await supabase.from("businesses").update({ is_active: status === "active" }).eq("id", businessId))
  }
  if (error) throw new ApiError(500, error.message)

  await logAudit({
    action: "business.status_changed",
    session,
    businessId,
    targetType: "business",
    targetId: businessId,
    metadata: { from: current.status ?? (current.is_active ? "active" : "suspended"), to: status, reason, businessName: current.name },
  })
}

// ---------------------------------------------------------------------------

async function syncOwnerStaffRow(businessId: string, ownerEmail: string) {
  const supabase = createSupabaseServerClient()

  const { data: pendingOwner } = await supabase
    .from("businesses_staff")
    .select("id")
    .eq("business_id", businessId)
    .eq("role", "owner")
    .is("user_id", null)
    .limit(1)
    .maybeSingle()

  if (pendingOwner) {
    await supabase.from("businesses_staff").update({ email: ownerEmail }).eq("id", pendingOwner.id)
    return
  }

  const { data: match } = await supabase
    .from("businesses_staff")
    .select("id")
    .eq("business_id", businessId)
    .eq("email", ownerEmail)
    .maybeSingle()

  if (match) {
    await supabase.from("businesses_staff").update({ role: "owner" }).eq("id", match.id)
  } else {
    await supabase.from("businesses_staff").insert({ business_id: businessId, email: ownerEmail, role: "owner", status: "invited" })
  }
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>
}
