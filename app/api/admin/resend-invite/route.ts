import { NextRequest, NextResponse } from "next/server"
import { normalizeEmail } from "@/lib/auth/normalize-email"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/auth/get-user-role"

export async function POST(req: NextRequest) {
  const { email, business_id } = await req.json()
  const normalizedEmail = normalizeEmail(email)

  const role = await getUserRole()

  // require either super admin, or an owner/manager for the target business
  const allowedForBusiness =
    role && role.business_id && role.business_id === business_id && (role.role === "owner" || role.role === "manager")

  if (!role || (!role.is_super_admin && !allowedForBusiness)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (!normalizedEmail || !business_id) {
    return NextResponse.json({ error: "email and business_id are required" }, { status: 400 })
  }

  const supabase = createSupabaseServerClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin

  const { error } = await supabase.auth.admin.inviteUserByEmail(normalizedEmail, {
    redirectTo: `${appUrl}/invite`,
    data: { business_id, role: "owner" },
  })

  if (error) {
    const msg = error.message.toLowerCase()
    if (msg.includes("already") && (msg.includes("registered") || msg.includes("exists") || msg.includes("confirmed"))) {
      return NextResponse.json({
        ok: true,
        warning: "Owner already has an account — ask them to sign in at /login directly.",
      })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
