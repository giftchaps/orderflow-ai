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
        message: "Server environment is not configured.",
        issues: envIssues,
      },
      { status: 500 }
    )
  }

  try {
    const orders = await listActiveOrders()

    return NextResponse.json({ ok: true, orders })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to load orders.",
      },
      { status: 500 }
    )
  }
}
