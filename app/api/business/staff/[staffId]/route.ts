import { NextRequest, NextResponse } from "next/server"
import { apiError, apiRequireBusiness, apiRequireSession, ApiError } from "@/lib/auth/guards"
import { removeTeamMember, resendTeamInvite, updateStaffSchema, updateTeamMember } from "@/lib/staff-mutations"

type Params = { params: Promise<{ staffId: string }> }

/** PATCH /api/business/staff/:staffId  { role?, status?, name? } */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await apiRequireSession()
    const businessId = session.activeBusinessId
    if (!businessId) throw new ApiError(400, "No active business for this account.")
    const { role } = await apiRequireBusiness(businessId, "staff.manage_roles")

    const { staffId } = await params
    const parsed = updateStaffSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) throw new ApiError(400, parsed.error.issues.map((i) => i.message).join(" "))
    await updateTeamMember({ session, role }, businessId, staffId, parsed.data)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return apiError(error)
  }
}

/** POST /api/business/staff/:staffId — resend invite */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await apiRequireSession()
    const businessId = session.activeBusinessId
    if (!businessId) throw new ApiError(400, "No active business for this account.")
    const { role } = await apiRequireBusiness(businessId, "staff.invite")

    const { staffId } = await params
    const result = await resendTeamInvite({ session, role }, businessId, staffId, req.nextUrl.origin)
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    return apiError(error)
  }
}

/** DELETE /api/business/staff/:staffId */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await apiRequireSession()
    const businessId = session.activeBusinessId
    if (!businessId) throw new ApiError(400, "No active business for this account.")
    const { role } = await apiRequireBusiness(businessId, "staff.remove")

    const { staffId } = await params
    await removeTeamMember({ session, role }, businessId, staffId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return apiError(error)
  }
}
