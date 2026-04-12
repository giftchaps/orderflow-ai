import { NextResponse } from "next/server"
import { createAuthClient } from "@/lib/supabase/auth-server"
import { resolveUserRole } from "@/lib/auth/resolve-user-role"

export async function GET() {
  try {
    const authClient = await createAuthClient()
    const { data: { user } } = await authClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const staff = await resolveUserRole(user)

    if (!staff) {
      return NextResponse.json(
        { error: "No staff record found for this account. Ask an administrator to invite this email address." },
        { status: 403 }
      )
    }

    return NextResponse.json(staff)
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unable to load account." },
      { status: 500 }
    )
  }
}
