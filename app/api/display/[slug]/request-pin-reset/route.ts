import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { normalizeEmail } from "@/lib/auth/normalize-email"
import { createSupabaseServerClientFromEnv } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

const SLUG_RE = /^[a-z0-9-]{1,80}$/

const bodySchema = z.object({
  email: z.string().email(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  if (!SLUG_RE.test(slug)) {
    return NextResponse.json({ ok: false, message: "Invalid business link." }, { status: 400 })
  }

  let normalizedEmail: string | null
  try {
    const body = bodySchema.parse(await request.json())
    normalizedEmail = normalizeEmail(body.email)
  } catch {
    return NextResponse.json({ ok: false, message: "Enter a valid email address." }, { status: 400 })
  }

  if (!normalizedEmail) {
    return NextResponse.json({ ok: false, message: "Enter a valid email address." }, { status: 400 })
  }

  const supabase = createSupabaseServerClientFromEnv()

  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("id, owner_email")
    .eq("slug", slug)
    .maybeSingle()

  if (businessError) {
    return NextResponse.json({ ok: false, message: "Unable to request a reset right now." }, { status: 500 })
  }

  if (!business) {
    return NextResponse.json({ ok: true })
  }

  const ownerEmail = normalizeEmail(business.owner_email)
  const isOwnerEmail = ownerEmail === normalizedEmail

  const { data: staffRows } = await supabase
    .from("businesses_staff")
    .select("id")
    .eq("business_id", business.id)
    .ilike("email", normalizedEmail)
    .in("role", ["owner", "manager"])
    .limit(1)

  const isAllowed = isOwnerEmail || Boolean(staffRows?.length)

  if (isAllowed) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin
    await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${appUrl}/business/settings`,
      },
    })
  }

  return NextResponse.json({ ok: true })
}
