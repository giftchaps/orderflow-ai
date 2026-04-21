import { NextRequest, NextResponse } from "next/server"
import { normalizeEmail } from "@/lib/auth/normalize-email"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/auth/get-user-role"

export async function POST(req: NextRequest) {
  // Only super admins can onboard new businesses
  const role = await getUserRole()
  if (!role?.is_super_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { name, slug, address, timezone, prep_time_minutes, owner_name, owner_email, plan, menu } = body
    const normalizedOwnerEmail = normalizeEmail(owner_email)

    if (!name || !slug || !normalizedOwnerEmail) {
      return NextResponse.json({ error: "name, slug, and owner_email are required" }, { status: 400 })
    }

    const supabase = createSupabaseServerClient()

    // Prevent accidental duplicate submissions for the same business owner/name pair
    const { data: existingBusiness } = await supabase
      .from("businesses")
      .select("id")
      .eq("owner_email", normalizedOwnerEmail)
      .ilike("name", name)
      .maybeSingle()

    if (existingBusiness) {
      return NextResponse.json(
        { error: "A business with this owner email and name already exists." },
        { status: 409 }
      )
    }

    // Check slug is unique
    const { data: existing } = await supabase
      .from("businesses")
      .select("id")
      .eq("slug", slug)
      .single()

    if (existing) {
      return NextResponse.json({ error: "Slug already taken" }, { status: 409 })
    }

    // Create the business
    const { data: biz, error: bizErr } = await supabase
      .from("businesses")
      .insert({
        name,
        slug,
        address: address ?? null,
        timezone: timezone ?? "America/New_York",
        prep_time_minutes: prep_time_minutes ?? 15,
        plan: plan ?? "starter",
        owner_email: normalizedOwnerEmail,
        menu: menu ?? null,
      })
      .select("id")
      .single()

    if (bizErr || !biz) {
      console.error("[admin/onboard] business insert:", bizErr)
      return NextResponse.json({ error: bizErr?.message ?? "Failed to create business" }, { status: 500 })
    }

    // Create staff record for owner (no user_id yet — pending invite)
    const { error: staffErr } = await supabase.from("businesses_staff").insert({
      business_id: biz.id,
      email: normalizedOwnerEmail,
      name: owner_name ?? null,
      role: "owner",
      is_super_admin: false,
    })

    if (staffErr) {
      console.error("[admin/onboard] staff insert:", staffErr)
      // Don't fail — business was created, staff row can be fixed
    }

    // Send invite email via Supabase Auth
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin
    if (process.env.VERCEL_ENV === "production" && appUrl.includes("localhost")) {
      return NextResponse.json(
        {
          error:
            "NEXT_PUBLIC_APP_URL is localhost in production. Update the Vercel env var and the Supabase Auth Site URL before sending invites.",
        },
        { status: 500 }
      )
    }
    const { error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(normalizedOwnerEmail, {
      redirectTo: `${appUrl}/invite`,
      data: { business_id: biz.id, role: "owner", name: owner_name ?? "" },
    })

    if (inviteErr) {
      console.error("[admin/onboard] invite error:", inviteErr)

      const msg = inviteErr.message.toLowerCase()
      if (msg.includes("already") && (msg.includes("registered") || msg.includes("exists") || msg.includes("confirmed"))) {
        return NextResponse.json({
          ok: true,
          business_id: biz.id,
          invite_sent: false,
          warning:
            "Business created. Owner already has an account, so no new invite was sent. Ask them to sign in at /login.",
        })
      }

      return NextResponse.json({
        ok: true,
        business_id: biz.id,
        invite_sent: false,
        warning: "Business created but invite failed: " + inviteErr.message,
      })
    }

    return NextResponse.json({ ok: true, business_id: biz.id, invite_sent: true })
  } catch (err: any) {
    console.error("[admin/onboard]", err)
    return NextResponse.json({ error: err.message ?? "Internal error" }, { status: 500 })
  }
}
