import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { deleteOrder, updateOrderStatus } from "@/lib/orders-server"
import { createSupabaseServerClientFromEnv } from "@/lib/supabase/server"
import { apiError, apiRequireSession, ApiError } from "@/lib/auth/guards"
import { canInBusiness, getSession } from "@/lib/auth/session"
import { verifyDisplayToken } from "@/lib/kds-token"
import { logAudit } from "@/lib/audit"

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

const SLUG_RE = /^[a-z0-9-]{1,80}$/

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get("slug")
  const displayToken = request.headers.get("x-kds-token")

  const session = await getSession()

  // Resolve business_id: prefer authenticated session, otherwise require a valid display token.
  let resolvedBusinessId: string | null = null
  let hasDisplayAccess = false

  if (session?.activeBusinessId) {
    resolvedBusinessId = session.activeBusinessId
  } else if (slug) {
    if (!SLUG_RE.test(slug)) {
      return NextResponse.json({ ok: false, message: "Invalid slug." }, { status: 400 })
    }
    hasDisplayAccess = !!displayToken && verifyDisplayToken(slug, displayToken)
    if (!session?.isPlatformAdmin && !hasDisplayAccess) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 })
    }

    const supabase = createSupabaseServerClientFromEnv()
    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("slug", slug)
      .single()
    if (business) resolvedBusinessId = business.id
  }

  if (!resolvedBusinessId) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { orderId } = await params

    // Verify the order belongs to the resolved business
    if (!session?.isPlatformAdmin) {
      const supabase = createSupabaseServerClientFromEnv()
      const { data: order } = await supabase
        .from("orders")
        .select("business_id")
        .eq("id", orderId)
        .maybeSingle()
      if (!order || order.business_id !== resolvedBusinessId) {
        return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 })
      }
    }
    const body = bodySchema.parse(await request.json())

    await updateOrderStatus(resolvedBusinessId, orderId, body.status, {
      type: session ? "staff" : "display",
      userId: session?.user.id ?? null,
      email: session?.user.email ?? null,
    })

    // Send SMS when order is marked ready
    if (body.status === "ready") {
      const supabase = createSupabaseServerClientFromEnv()
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

/**
 * DELETE /api/orders/[orderId] — permanently remove one order from history.
 * Staff-authenticated only (no display-token path): this is a cleanup action
 * for owners/managers, not something the kitchen tablet's PIN gate should be
 * able to trigger.
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const session = await apiRequireSession()
    const businessId = session.activeBusinessId
    if (!businessId) throw new ApiError(403, "No active business.")
    if (!canInBusiness(session, businessId, "orders.delete")) {
      throw new ApiError(403, "Your role does not allow deleting orders.")
    }

    const { orderId } = await params
    const orderNumber = await deleteOrder(businessId, orderId)
    if (orderNumber === null) throw new ApiError(404, "Order not found.")

    await logAudit({
      action: "order.deleted",
      session,
      businessId,
      targetType: "order",
      targetId: orderId,
      metadata: { order_number: orderNumber },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return apiError(error)
  }
}
