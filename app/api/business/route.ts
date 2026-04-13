import { NextRequest, NextResponse } from "next/server"
import { getServerEnv } from "@/lib/env"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug")

  if (slug) {
    const supabase = createSupabaseServerClient()
    const { data } = await supabase
      .from("businesses")
      .select("name, phone")
      .eq("slug", slug)
      .single()

    if (data) {
      return NextResponse.json({ name: data.name, phone: data.phone ?? null })
    }
  }

  // Fall back to env-configured business
  const { ORDERFLOW_BUSINESS_NAME, ORDERFLOW_BUSINESS_PHONE } = getServerEnv()
  return NextResponse.json({
    name: ORDERFLOW_BUSINESS_NAME,
    phone: ORDERFLOW_BUSINESS_PHONE ?? null,
  })
}
