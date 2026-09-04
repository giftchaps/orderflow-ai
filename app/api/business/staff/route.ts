import { NextRequest, NextResponse } from "next/server"
import { apiError, apiRequireBusiness, apiRequireSession, ApiError } from "@/lib/auth/guards"
import { inviteStaffSchema, inviteTeamMember } from "@/lib/staff-mutations"
import { fetchStaff } from "@/lib/business"

/** GET /api/business/staff — team for the caller's active business. */
export async function GET() {
  try {
    const session = await apiRequireSession()
    const businessId = session.activeBusinessId
    if (!businessId) throw new ApiError(400, "No active business for this account.")
    await apiRequireBusiness(businessId, "staff.view")
    return NextResponse.json({ ok: true, staff: await fetchStaff(businessId) })
  } catch (error) {
    return apiError(error)
  }
}

/** POST /api/business/staff  { email, name?, role } — invite a team member to the caller's active business. */
export async function POST(req: NextRequest) {
  try {
    const session = await apiRequireSession()
    const businessId = session.activeBusinessId
    if (!businessId) throw new ApiError(400, "No active business for this account.")
    const { role } = await apiRequireBusiness(businessId, "staff.invite")

    const parsed = inviteStaffSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) throw new ApiError(400, parsed.error.issues.map((i) => i.message).join(" "))

    const result = await inviteTeamMember({ session, role }, businessId, parsed.data, req.nextUrl.origin)
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    return apiError(error)
  }
}
