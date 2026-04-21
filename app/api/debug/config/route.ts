import { NextResponse } from "next/server"
import { getServerEnvIssues, getServerEnv } from "@/lib/env"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/auth/get-user-role"

export const dynamic = "force-dynamic"

export async function GET() {
  const role = await getUserRole()
  if (!role?.is_super_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
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
  const publicSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publicSupabaseHost = publicSupabaseUrl ? new URL(publicSupabaseUrl).host : null
  const serverSupabaseHost = new URL(env.SUPABASE_URL).host
  const sameSupabaseProject =
    publicSupabaseHost !== null && publicSupabaseHost === serverSupabaseHost
  const deploymentInfo = {
    vercelEnv: process.env.VERCEL_ENV ?? null,
    vercelUrl: process.env.VERCEL_URL ?? null,
    vercelProjectProductionUrl: process.env.VERCEL_PROJECT_PRODUCTION_URL ?? null,
    vercelGitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    vercelGitCommitRef: process.env.VERCEL_GIT_COMMIT_REF ?? null,
    nextPublicAppUrl: process.env.NEXT_PUBLIC_APP_URL ?? null,
  }
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
        supabaseHost: serverSupabaseHost,
        publicSupabaseHost,
        sameSupabaseProject,
        deploymentInfo,
        businessId: env.ORDERFLOW_BUSINESS_ID,
        message: error.message,
      },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    supabaseHost: serverSupabaseHost,
    publicSupabaseHost,
    sameSupabaseProject,
    deploymentInfo,
    businessId: env.ORDERFLOW_BUSINESS_ID,
    matchingActiveOrders: count ?? 0,
  })
}
