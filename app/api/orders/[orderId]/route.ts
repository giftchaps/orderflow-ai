import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getServerEnvIssues } from "@/lib/env"
import { updateOrderStatus } from "@/lib/orders"

export const dynamic = "force-dynamic"

const bodySchema = z.object({
  status: z.enum(["making", "ready", "done", "cancelled"]),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
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
    const { orderId } = await params
    const body = bodySchema.parse(await request.json())

    await updateOrderStatus(orderId, body.status)

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          ok: false,
          message: "Invalid request body.",
          issues: error.issues.map((issue) => issue.message),
        },
        { status: 400 }
      )
    }

    const message =
      error instanceof Error ? error.message : "Unable to update order status."
    const status =
      message === "Order not found" || message.startsWith("Invalid status transition")
        ? 400
        : 500

    return NextResponse.json({ ok: false, message }, { status })
  }
}
