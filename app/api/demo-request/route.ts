import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const name = typeof body.name === "string" ? body.name.trim() : ""
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
    const businessName = typeof body.business_name === "string" ? body.business_name.trim() : ""
    const phone = typeof body.phone === "string" ? body.phone.trim() : ""
    const message = typeof body.message === "string" ? body.message.trim() : ""

    if (!name || !email || !businessName) {
      return NextResponse.json(
        { error: "name, email, and business_name are required" },
        { status: 400 }
      )
    }

    const supabase = createSupabaseServerClient()

    const { error } = await supabase.from("demo_requests").insert({
      name,
      email,
      business_name: businessName,
      phone: phone || null,
      message: message || null,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save demo request" },
      { status: 500 }
    )
  }
}
