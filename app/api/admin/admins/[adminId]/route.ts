import { NextRequest, NextResponse } from "next/server"
import { apiError, apiRequirePlatformAdmin, ApiError } from "@/lib/auth/guards"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { logAudit } from "@/lib/audit"

/** DELETE /api/admin/admins/:adminId — revoke platform-admin access. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ adminId: string }> }) {
  try {
    const session = await apiRequirePlatformAdmin()
    const { adminId } = await params
    const supabase = createSupabaseServerClient()

    const { data: target } = await supabase.from("platform_admins").select("id, email, user_id").eq("id", adminId).maybeSingle()
    if (!target) throw new ApiError(404, "Admin not found.")
    if (target.user_id === session.user.id) throw new ApiError(400, "You cannot remove your own admin access.")

    const { count } = await supabase.from("platform_admins").select("*", { count: "exact", head: true })
    if ((count ?? 0) <= 1) throw new ApiError(409, "The platform must keep at least one administrator.")

    const { error } = await supabase.from("platform_admins").delete().eq("id", adminId)
    if (error) throw new ApiError(500, error.message)

    await logAudit({
      action: "platform_admin.removed",
      session,
      targetType: "platform_admin",
      targetId: adminId,
      metadata: { email: target.email },
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return apiError(error)
  }
}
