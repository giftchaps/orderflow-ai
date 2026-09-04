import { NextRequest, NextResponse } from "next/server"
import { apiError, apiRequirePlatformAdmin, ApiError } from "@/lib/auth/guards"
import {
  businessPlatformSchema,
  businessProfileSchema,
  displayPinSchema,
  updateBusinessPlatformFields,
  updateBusinessProfile,
  updateDisplayPin,
} from "@/lib/business-mutations"
import { fetchBusiness, fetchStaff } from "@/lib/business"

export const dynamic = "force-dynamic"

type Params = { params: Promise<{ businessId: string }> }

/** GET /api/admin/businesses/:id — full tenant record + staff (platform admin). */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await apiRequirePlatformAdmin()
    const { businessId } = await params
    const business = await fetchBusiness({ id: businessId })
    if (!business) throw new ApiError(404, "Business not found.")
    const staff = await fetchStaff(businessId)
    const { display_pin, display_pin_hash, ...safe } = business
    return NextResponse.json({ ok: true, business: { ...safe, has_pin: Boolean(display_pin || display_pin_hash) }, staff })
  } catch (error) {
    return apiError(error)
  }
}

/**
 * PATCH /api/admin/businesses/:id
 * Platform admins may change profile fields, platform fields (plan, agent,
 * telephony, owner, slug) and the display PIN in one call. Each group is
 * validated and audited separately.
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = await apiRequirePlatformAdmin()
    const { businessId } = await params
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
    if (!body || typeof body !== "object") throw new ApiError(400, "Invalid JSON body.")

    const existing = await fetchBusiness({ id: businessId })
    if (!existing) throw new ApiError(404, "Business not found.")

    const profile = businessProfileSchema.safeParse(pick(body, ["name", "address", "timezone", "prep_time_minutes", "ai_greeting", "business_hours"]))
    const platform = businessPlatformSchema.safeParse(pick(body, ["plan", "phone_number", "sms_from_number", "vapi_assistant_id", "owner_email", "slug"]))
    const pin = "display_pin" in body ? displayPinSchema.safeParse({ display_pin: body.display_pin }) : null

    const issues = [profile, platform, pin].flatMap((r) => (r && !r.success ? r.error.issues.map((i) => i.message) : []))
    if (issues.length > 0) throw new ApiError(400, issues.join(" "))

    let changed = 0
    if (profile.success && Object.keys(stripUndefined(profile.data)).length > 0) {
      await updateBusinessProfile(session, businessId, profile.data)
      changed += 1
    }
    if (platform.success && Object.keys(stripUndefined(platform.data)).length > 0) {
      await updateBusinessPlatformFields(session, businessId, platform.data)
      changed += 1
    }
    if (pin?.success) {
      await updateDisplayPin(session, businessId, pin.data.display_pin)
      changed += 1
    }
    if (changed === 0) throw new ApiError(400, "No changes provided.")

    return NextResponse.json({ ok: true })
  } catch (error) {
    return apiError(error)
  }
}

function pick(obj: Record<string, unknown>, keys: string[]) {
  return Object.fromEntries(keys.filter((k) => k in obj).map((k) => [k, obj[k]]))
}
function stripUndefined(obj: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined))
}
