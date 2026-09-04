import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { apiError, apiRequirePlatformAdmin, ApiError } from "@/lib/auth/guards"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { normalizeEmail } from "@/lib/auth/normalize-email"
import { findAuthUserByEmail } from "@/lib/invitations"
import { getAppUrl } from "@/lib/env"
import { logAudit } from "@/lib/audit"
import { listPlatformAdmins } from "@/lib/platform"

const addSchema = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().max(120).optional().or(z.literal("")),
})

/** GET /api/admin/admins */
export async function GET() {
  try {
    await apiRequirePlatformAdmin()
    return NextResponse.json({ ok: true, admins: await listPlatformAdmins() })
  } catch (error) {
    return apiError(error)
  }
}

/**
 * POST /api/admin/admins  { email, name? }
 * Grants platform-admin access. If the person has no auth account yet, an
 * invite email is sent; on acceptance /api/auth/accept-invite links user_id.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await apiRequirePlatformAdmin()
    const parsed = addSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) throw new ApiError(400, "A valid email is required.")

    const email = normalizeEmail(parsed.data.email)
    const supabase = createSupabaseServerClient()

    const { data: exists } = await supabase.from("platform_admins").select("id").eq("email", email).maybeSingle()
    if (exists) throw new ApiError(409, "That email is already a platform admin.")

    const existingUser = await findAuthUserByEmail(email)
    const { data: row, error } = await supabase
      .from("platform_admins")
      .insert({ email, name: parsed.data.name || null, user_id: existingUser?.id ?? null, created_by: session.user.id })
      .select("id")
      .single()
    if (error || !row) throw new ApiError(500, error?.message ?? "Failed to add admin.")

    let emailSent = false
    if (!existingUser) {
      const { error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${getAppUrl(req.nextUrl.origin)}/invite`,
        data: { platform_admin: true, name: parsed.data.name ?? "" },
      })
      emailSent = !inviteErr
      if (inviteErr) console.warn("[admins] invite failed:", inviteErr.message)
    }

    await logAudit({
      action: "platform_admin.added",
      session,
      targetType: "platform_admin",
      targetId: row.id,
      metadata: { email, emailSent, linkedExisting: Boolean(existingUser) },
    })

    return NextResponse.json({ ok: true, id: row.id, emailSent, linkedExisting: Boolean(existingUser) })
  } catch (error) {
    return apiError(error)
  }
}
