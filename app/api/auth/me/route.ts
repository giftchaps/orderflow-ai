import { NextResponse } from "next/server"
import { createAuthClient } from "@/lib/supabase/auth-server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const authClient = await createAuthClient()
    const { data: { user } } = await authClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Use service role to bypass RLS
    const admin = createSupabaseServerClient()

    // Try by user_id first
    let { data: staff } = await admin
      .from("businesses_staff")
      .select("role, business_id, is_super_admin, user_id, email")
      .eq("user_id", user.id)
      .single()

    // Fall back to email lookup and auto-link
    if (!staff) {
      const { data: byEmail } = await admin
        .from("businesses_staff")
        .select("role, business_id, is_super_admin, user_id, email")
        .eq("email", user.email ?? "")
        .single()

      if (byEmail) {
        staff = byEmail
        // Link user_id for future logins
        await admin
          .from("businesses_staff")
          .update({ user_id: user.id })
          .eq("email", user.email ?? "")
      }
    }

    if (!staff) {
      return NextResponse.json({ error: "No staff record found" }, { status: 403 })
    }

    return NextResponse.json(staff)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
