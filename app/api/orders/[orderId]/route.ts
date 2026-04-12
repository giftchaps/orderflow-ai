import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getServerEnvIssues } from "@/lib/env"
import { updateOrderStatus } from "@/lib/orders"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

async function sendReadySms(to: string, orderNumber: number) {
  const apiKey = process.env.TELNYX_API_KEY
  const fromNumber = process.env.TELNYX_FROM_NUMBER
  const businessName = process.env.ORDERFLOW_BUSINESS_NAME ?? "the restaurant"
  if (!apiKey || !fromNumber) return

  try {
    await fetch("https://api.telnyx.com/v2/messages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromNumber,
        to,
        text: `Your order #${orderNumber} is ready for pickup at ${businessName}! See you soon.`,
      }),
    })
  } catch {
    // SMS failure should not block the status update response
  }
}

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

    // Send SMS when order is marked ready
    if (body.status === "ready") {
      const supabase = createSupabaseServerClient()
      const { data: order } = await supabase
        .from("orders")
        .select("customer_phone, order_number")
        .eq("id", orderId)
        .maybeSingle()

      if (order?.customer_phone) {
        await sendReadySms(order.customer_phone, order.order_number)
      }
    }

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
