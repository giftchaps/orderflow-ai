import { NextResponse } from "next/server"
import { getServerEnvIssues, getServerEnv } from "@/lib/env"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const issues = getServerEnvIssues()

  if (issues.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        issues,
      },
      { status: 500 }
    )
  }

  const env = getServerEnv()
  const supabase = createSupabaseServerClient()

  const { count, error } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("business_id", env.ORDERFLOW_BUSINESS_ID)
    .in("status", ["pending", "making", "ready"])

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        supabaseHost: new URL(env.SUPABASE_URL).host,
        businessId: env.ORDERFLOW_BUSINESS_ID,
        message: error.message,
      },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    supabaseHost: new URL(env.SUPABASE_URL).host,
    businessId: env.ORDERFLOW_BUSINESS_ID,
    matchingActiveOrders: count ?? 0,
  })
}
