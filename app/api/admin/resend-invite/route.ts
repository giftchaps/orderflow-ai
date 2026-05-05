import { NextRequest, NextResponse } from "next/server"
import { normalizeEmail } from "@/lib/auth/normalize-email"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/auth/get-user-role"

export async function POST(req: NextRequest) {
  const role = await getUserRole()
  if (!role?.is_super_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { email, business_id } = await req.json()
  const normalizedEmail = normalizeEmail(email)

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
