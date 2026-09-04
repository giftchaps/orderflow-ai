import { NextResponse } from "next/server"
import { z } from "zod"
import { createAuthClient } from "@/lib/supabase/auth-server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { normalizeEmail } from "@/lib/auth/normalize-email"
import { logAudit } from "@/lib/audit"

const bodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  accessToken: z.string().optional(),
})

/**
 * POST /api/auth/accept-invite
 * Called once the invitee has set their password. Links every pending staff
 * row for their email to the auth user, stores their display name, and
 * activates the membership. Uses the service role so it works before RLS is
 * satisfied (the staff row has no user_id yet).
 */
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "A name is required." }, { status: 400 })
  }

  const auth = await createAuthClient()
  const {
    data: { user },
  } = parsed.data.accessToken ? await auth.auth.getUser(parsed.data.accessToken) : await auth.auth.getUser()

  if (!user) return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 })

  const email = normalizeEmail(user.email)
  const admin = createSupabaseServerClient()

  const { data: rows, error } = await admin
    .from("businesses_staff")
    .update({ user_id: user.id, name: parsed.data.name, status: "active" })
    .or(`user_id.eq.${user.id},email.eq.${email}`)
    .select("id, business_id, role")

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  // If the invited owner accepted, move the business from "invited" to "active".
  const ownerRows = (rows ?? []).filter((r) => r.role === "owner")
  if (ownerRows.length > 0) {
    await admin
      .from("businesses")
      .update({ status: "active", is_active: true })
      .in(
        "id",
        ownerRows.map((r) => r.business_id)
      )
      .eq("status", "invited")
  }

  await logAudit({
    action: "staff.invited",
    actorType: "user",
    metadata: { event: "accepted", userId: user.id, email, staffIds: (rows ?? []).map((r) => r.id) },
  })

  return NextResponse.json({ ok: true, linked: rows?.length ?? 0 })
}
