import { NextRequest, NextResponse } from "next/server"
import { apiError, apiRequirePlatformAdmin, ApiError } from "@/lib/auth/guards"
import { removeTeamMember, resendTeamInvite, updateStaffSchema, updateTeamMember } from "@/lib/staff-mutations"

type Params = { params: Promise<{ businessId: string; staffId: string }> }

/** PATCH /api/admin/businesses/:id/staff/:staffId  { role?, status?, name? } */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await apiRequirePlatformAdmin()
    const { businessId, staffId } = await params
    const parsed = updateStaffSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) throw new ApiError(400, parsed.error.issues.map((i) => i.message).join(" "))
    await updateTeamMember({ session, role: "platform_admin" }, businessId, staffId, parsed.data)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return apiError(error)
  }
}

/** POST /api/admin/businesses/:id/staff/:staffId  — resend invite */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await apiRequirePlatformAdmin()
    const { businessId, staffId } = await params
    const result = await resendTeamInvite({ session, role: "platform_admin" }, businessId, staffId, req.nextUrl.origin)
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    return apiError(error)
  }
}

/** DELETE /api/admin/businesses/:id/staff/:staffId */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await apiRequirePlatformAdmin()
    const { businessId, staffId } = await params
    await removeTeamMember({ session, role: "platform_admin" }, businessId, staffId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return apiError(error)
  }
}
