import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@supabase/supabase-js"
import { signDisplayToken } from "@/lib/kds-token"

export const dynamic = "force-dynamic"

const SLUG_RE = /^[a-z0-9-]{1,80}$/

const bodySchema = z.object({
  pin: z.string().max(8),
})

function getSupabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Supabase not configured")
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

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

  let supabase: ReturnType<typeof getSupabase>
  try {
    supabase = getSupabase()
  } catch {
    return NextResponse.json({ ok: false, message: "Server not configured." }, { status: 500 })
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("display_pin")
    .eq("slug", slug)
    .single()

  if (!business) {
    return NextResponse.json({ ok: false, message: "Business not found." }, { status: 404 })
  }

  // If no PIN is set, allow access freely
  if (!business.display_pin) {
    return NextResponse.json({ ok: true, token: signDisplayToken(slug) })
  }

  if (!body.pin || body.pin !== business.display_pin) {
    return NextResponse.json({ ok: false, message: "Incorrect PIN." }, { status: 401 })
  }

  return NextResponse.json({ ok: true, token: signDisplayToken(slug) })
}
