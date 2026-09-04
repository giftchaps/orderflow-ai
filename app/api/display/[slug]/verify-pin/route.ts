import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createSupabaseServerClientFromEnv } from "@/lib/supabase/server"
import { hasPin, signDisplayToken, verifyPin } from "@/lib/kds-token"

export const dynamic = "force-dynamic"

const SLUG_RE = /^[a-z0-9-]{1,80}$/

const bodySchema = z.object({
  pin: z.string().max(8),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  if (!SLUG_RE.test(slug)) {
    return NextResponse.json({ ok: false, message: "Invalid slug." }, { status: 400 })
  }

  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(await request.json())
  } catch {
    return NextResponse.json({ ok: false, message: "PIN must be 4–8 digits." }, { status: 400 })
  }

  let supabase: ReturnType<typeof createSupabaseServerClientFromEnv>
  try {
    supabase = createSupabaseServerClientFromEnv()
  } catch {
    return NextResponse.json({ ok: false, message: "Server not configured." }, { status: 500 })
  }

  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("id, display_pin, display_pin_hash")
    .eq("slug", slug)
    .maybeSingle()

  if (businessError || !business) {
    return NextResponse.json({ ok: false, message: "Business not found." }, { status: 404 })
  }

  // If no PIN is set, allow access freely.
  if (!hasPin(business)) {
    return NextResponse.json({ ok: true, token: signDisplayToken(slug) })
  }

  if (!body.pin || !verifyPin(business.id, body.pin, business)) {
    return NextResponse.json({ ok: false, message: "Incorrect PIN." }, { status: 401 })
  }

  return NextResponse.json({ ok: true, token: signDisplayToken(slug) })
}
