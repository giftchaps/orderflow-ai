import { NextRequest, NextResponse } from "next/server"
import { apiError, apiRequirePlatformAdmin, ApiError } from "@/lib/auth/guards"
import { inviteStaffSchema, inviteTeamMember } from "@/lib/staff-mutations"
import { fetchStaff } from "@/lib/business"

type Params = { params: Promise<{ businessId: string }> }

/** GET /api/admin/businesses/:id/staff */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await apiRequirePlatformAdmin()
    const { businessId } = await params
    return NextResponse.json({ ok: true, staff: await fetchStaff(businessId) })
  } catch (error) {
    return apiError(error)
  }
}

/** POST /api/admin/businesses/:id/staff  { email, name?, role } — invite as platform admin. */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await apiRequirePlatformAdmin()
    const { businessId } = await params
    const parsed = inviteStaffSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) throw new ApiError(400, parsed.error.issues.map((i) => i.message).join(" "))

    const result = await inviteTeamMember({ session, role: "platform_admin" }, businessId, parsed.data, req.nextUrl.origin)
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    return apiError(error)
  }
}
