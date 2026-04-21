import { NextResponse } from "next/server"
import { z } from "zod"
import { createSupabaseServerClientFromEnv } from "@/lib/supabase/server"
import { getServerEnvIssues } from "@/lib/env"

export const dynamic = "force-dynamic"

const SLUG_RE = /^[a-z0-9-]{1,80}$/

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get("slug")

  if (slug) {
    if (!SLUG_RE.test(slug)) {
      return NextResponse.json(
        {
          ok: false,
          status: "error",
          message: "Invalid slug.",
        },
        { status: 400 }
      )
    }

    try {
      const supabase = createSupabaseServerClientFromEnv()

      const { data: business, error: businessError } = await supabase
        .from("businesses")
        .select("id")
        .eq("slug", slug)
        .single()

      if (businessError || !business) {
        return NextResponse.json(
          {
            ok: false,
            status: "error",
            message: "Business not found.",
          },
          { status: 404 }
        )
      }

      const { count, error } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("business_id", business.id)
        .in("status", ["pending", "making", "ready"])

      if (error) {
        return NextResponse.json(
          {
            ok: false,
            status: "error",
            message: error.message,
          },
          { status: 500 }
        )
      }

      return NextResponse.json({
        ok: true,
        status: "connected",
        message: "Database connection is healthy.",
        matchingActiveOrders: count ?? 0,
      })
    } catch (error) {
      return NextResponse.json(
        {
          ok: false,
          status: "error",
          message: error instanceof Error ? error.message : "Unable to query the orders table.",
        },
        { status: 500 }
      )
    }
  }

  const envIssues = getServerEnvIssues()

  if (envIssues.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        status: "misconfigured",
        message: "Server environment variables are missing or invalid.",
        issues: envIssues,
      },
      { status: 500 }
    )
  }

  try {
    const supabase = createSupabaseServerClientFromEnv()
    const { error } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "making", "ready"])

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({
      ok: true,
      status: "connected",
      message: "Database connection is healthy.",
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        status: "error",
        message:
          error instanceof Error ? error.message : "Unable to query the orders table.",
      },
      { status: 500 }
    )
  }
}
