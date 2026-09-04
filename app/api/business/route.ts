import { NextRequest, NextResponse } from "next/server"
import { apiError, apiRequireSession, ApiError } from "@/lib/auth/guards"
import { canInBusiness } from "@/lib/auth/session"
import { businessProfileSchema, displayPinSchema, updateBusinessProfile, updateDisplayPin } from "@/lib/business-mutations"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getServerEnv } from "@/lib/env"

export const dynamic = "force-dynamic"

const SLUG_RE = /^[a-z0-9-]{1,80}$/

/** GET /api/business?slug=... — public lookup used by the kitchen display header. */
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug")
  const supabase = createSupabaseServerClient()

  if (slug) {
    if (!SLUG_RE.test(slug)) {
      return NextResponse.json({ error: "Invalid slug." }, { status: 400 })
    }
    const { data } = await supabase.from("businesses").select("name, phone_number").eq("slug", slug).maybeSingle()
    if (data) {
      return NextResponse.json({ name: data.name, phone: data.phone_number ?? null })
    }
  }

  // Legacy single-tenant fallback, only used when no slug is given.
  const { ORDERFLOW_BUSINESS_ID } = getServerEnv()
  if (ORDERFLOW_BUSINESS_ID) {
    const { data } = await supabase.from("businesses").select("name, phone_number").eq("id", ORDERFLOW_BUSINESS_ID).maybeSingle()
    if (data) return NextResponse.json({ name: data.name, phone: data.phone_number ?? null })
  }

  return NextResponse.json({ name: null, phone: null })
}

function pick(obj: Record<string, unknown>, keys: string[]) {
  return Object.fromEntries(keys.filter((k) => k in obj).map((k) => [k, obj[k]]))
}
function stripUndefined(obj: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined))
}

/**
 * PATCH /api/business — self-service update of the caller's active business.
 * Profile fields require `settings.edit`; `display_pin` requires `display.manage_pin`.
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await apiRequireSession()
    const businessId = session.activeBusinessId
    if (!businessId) throw new ApiError(400, "No active business for this account.")

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
    if (!body || typeof body !== "object") throw new ApiError(400, "Invalid JSON body.")

    const profile = businessProfileSchema.safeParse(pick(body, ["name", "address", "timezone", "prep_time_minutes", "ai_greeting", "business_hours"]))
    const pin = "display_pin" in body ? displayPinSchema.safeParse({ display_pin: body.display_pin }) : null

    const issues = [profile, pin].flatMap((r) => (r && !r.success ? r.error.issues.map((i) => i.message) : []))
    if (issues.length > 0) throw new ApiError(400, issues.join(" "))

    let changed = 0
    if (profile.success && Object.keys(stripUndefined(profile.data)).length > 0) {
      if (!canInBusiness(session, businessId, "settings.edit")) throw new ApiError(403, "Your role does not allow editing settings.")
      await updateBusinessProfile(session, businessId, profile.data)
      changed += 1
    }
    if (pin?.success) {
      if (!canInBusiness(session, businessId, "display.manage_pin")) throw new ApiError(403, "Your role does not allow managing the display PIN.")
      await updateDisplayPin(session, businessId, pin.data.display_pin)
      changed += 1
    }
    if (changed === 0) throw new ApiError(400, "No changes provided.")

    return NextResponse.json({ ok: true })
  } catch (error) {
    return apiError(error)
  }
}
