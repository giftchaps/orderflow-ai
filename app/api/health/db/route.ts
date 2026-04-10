import { NextResponse } from "next/server"
import { getServerEnvIssues } from "@/lib/env"
import { listActiveOrders } from "@/lib/orders"

export const dynamic = "force-dynamic"

export async function GET() {
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
    await listActiveOrders()

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
