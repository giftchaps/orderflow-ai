import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { apiError, apiRequireSession, ApiError } from "@/lib/auth/guards"
import { canInBusiness } from "@/lib/auth/session"
import { resendTeamInvite } from "@/lib/staff-mutations"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { normalizeEmail } from "@/lib/auth/normalize-email"

const bodySchema = z.object({
  business_id: z.string().uuid(),
  staff_id: z.string().uuid().optional(),
  email: z.string().email().optional(),
})

/**
 * POST /api/admin/resend-invite  { business_id, staff_id | email }
 * Compatibility endpoint: platform admins or owners/managers of the business.
 * Prefer /api/admin/businesses/:id/staff/:staffId (POST) or /api/business/staff/:staffId (POST).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await apiRequireSession()
    const parsed = bodySchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) throw new ApiError(400, "business_id and staff_id or email are required.")
    const { business_id, email } = parsed.data
    let { staff_id } = parsed.data

    if (!canInBusiness(session, business_id, "staff.invite")) throw new ApiError(403, "Forbidden.")

    if (!staff_id) {
      if (!email) throw new ApiError(400, "staff_id or email is required.")
      const supabase = createSupabaseServerClient()
      const { data } = await supabase
        .from("businesses_staff")
        .select("id")
        .eq("business_id", business_id)
        .eq("email", normalizeEmail(email))
        .maybeSingle()
      if (!data) throw new ApiError(404, "No pending invite for that email.")
      staff_id = data.id
    }
    if (!staff_id) throw new ApiError(400, "staff_id or email is required.")

    const membership = session.memberships.find((m) => m.businessId === business_id)
    const result = await resendTeamInvite(
      { session, role: session.isPlatformAdmin ? "platform_admin" : membership!.role },
      business_id,
      staff_id,
      req.nextUrl.origin
    )
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    return apiError(error)
  }
}
