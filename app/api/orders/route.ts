import { NextResponse } from "next/server"
import { z } from "zod"
import { getServerEnv, getServerEnvIssues } from "@/lib/env"
import { orderSchema, listActiveOrders } from "@/lib/orders"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

const orderItemModSchema = z.object({
  type: z.enum(["add", "remove", "note"]),
  item: z.string().min(1),
})

const createOrderItemSchema = z.object({
  name: z.string().min(1),
  qty: z.coerce.number().int().positive(),
  bread: z.string().nullable().optional(),
  mods: z.array(orderItemModSchema).optional().default([]),
})

const createOrderBodySchema = z.object({
  order_number: z.coerce.number().int().positive().optional(),
  orderNumber: z.coerce.number().int().positive().optional(),
  status: z.enum(["pending", "making", "ready", "done", "cancelled"]).optional(),
  channel: z.enum(["phone", "whatsapp_text", "whatsapp_voice", "sms"]).optional(),
  customer_phone: z.string().min(1).nullable().optional(),
  customerPhone: z.string().min(1).nullable().optional(),
  placed_at: z.string().datetime().optional(),
  placedAt: z.string().datetime().optional(),
  items: z.array(createOrderItemSchema).min(1),
  special_instructions: z.string().nullable().optional(),
  specialInstructions: z.string().nullable().optional(),
})

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

export async function POST(request: Request) {
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
    const body = createOrderBodySchema.parse(await request.json())
    const supabase = createSupabaseServerClient()
    const { ORDERFLOW_BUSINESS_ID } = getServerEnv()

    const { data: latestOrder, error: latestOrderError } = await supabase
      .from("orders")
      .select("order_number")
      .eq("business_id", ORDERFLOW_BUSINESS_ID)
      .order("order_number", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (latestOrderError) {
      throw new Error(latestOrderError.message)
    }

    const resolvedOrderNumber =
      body.order_number ?? body.orderNumber ?? (latestOrder?.order_number ?? 0) + 1

    const payload = {
      business_id: ORDERFLOW_BUSINESS_ID,
      order_number: resolvedOrderNumber,
      status: body.status ?? "pending",
      channel: body.channel ?? "phone",
      customer_phone: body.customer_phone ?? body.customerPhone ?? null,
      placed_at: body.placed_at ?? body.placedAt ?? new Date().toISOString(),
      items: body.items,
      special_instructions:
        body.special_instructions ?? body.specialInstructions ?? null,
    }

    const { data: createdOrder, error: createError } = await supabase
      .from("orders")
      .insert(payload)
      .select(
        "id, order_number, status, channel, customer_phone, placed_at, items, special_instructions"
      )
      .single()

    if (createError) {
      throw new Error(createError.message)
    }

    return NextResponse.json({ ok: true, order: orderSchema.parse(createdOrder) }, { status: 201 })
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

    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to create order.",
      },
      { status: 500 }
    )
  }
}
