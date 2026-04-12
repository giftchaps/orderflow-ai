import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  try {
    const { email, role, business_id } = await req.json()
    if (!email || !role || !business_id) {
      return NextResponse.json({ error: "email, role, and business_id are required" }, { status: 400 })
    }

    if (!["manager", "staff"].includes(role)) {
      return NextResponse.json({ error: "Role must be manager or staff" }, { status: 400 })
    }

    const supabase = createSupabaseServerClient()

    // Check if this email already has a record for this business
    const { data: existing } = await supabase
      .from("businesses_staff")
      .select("id")
      .eq("business_id", business_id)
      .eq("email", email)
      .single()

    if (existing) {
      return NextResponse.json({ message: "This email is already a staff member" }, { status: 409 })
    }

    // Create pending staff record
    const { error: staffErr } = await supabase.from("businesses_staff").insert({
      business_id,
      email,
      role,
      is_super_admin: false,
    })

    if (staffErr) {
      console.error("[invite-staff] staff insert:", staffErr)
      return NextResponse.json({ error: staffErr.message }, { status: 500 })
    }

    // Send invite email
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
    const { error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${appUrl}/invite`,
      data: { business_id, role },
    })

    if (inviteErr) {
      console.error("[invite-staff] invite error:", inviteErr)
      return NextResponse.json({ message: "Staff record created but invite email failed: " + inviteErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, message: `Invite sent to ${email}` })
  } catch (err: any) {
    console.error("[invite-staff]", err)
    return NextResponse.json({ error: err.message ?? "Internal error" }, { status: 500 })
  }
}
