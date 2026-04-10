import { z } from "zod"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getServerEnv } from "@/lib/env"

const orderItemModSchema = z.object({
  type: z.enum(["add", "remove", "note"]),
  item: z.string(),
})

const orderItemSchema = z.object({
  name: z.string(),
  qty: z.number().int().positive(),
  bread: z.string().nullable().optional(),
  mods: z.array(orderItemModSchema).optional(),
})

export const orderSchema = z.object({
  id: z.string().uuid().or(z.string().min(1)),
  order_number: z.number().int(),
  status: z.enum(["pending", "making", "ready", "done", "cancelled"]),
  channel: z.enum(["phone", "whatsapp_text", "whatsapp_voice", "sms"]),
  customer_phone: z.string().optional(),
  placed_at: z.string(),
  items: z.array(orderItemSchema),
  special_instructions: z.string().nullable().optional(),
})

export type Order = z.infer<typeof orderSchema>
export type OrderStatus = Order["status"]

const activeStatuses: OrderStatus[] = ["pending", "making", "ready"]

const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
  pending: ["making", "cancelled"],
  making: ["ready"],
  ready: ["done"],
  done: [],
  cancelled: [],
}

export async function listActiveOrders(): Promise<Order[]> {
  const supabase = createSupabaseServerClient()
  const { ORDERFLOW_BUSINESS_ID } = getServerEnv()

  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, channel, customer_phone, placed_at, items, special_instructions"
    )
    .eq("business_id", ORDERFLOW_BUSINESS_ID)
    .in("status", activeStatuses)
    .order("placed_at", { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return z.array(orderSchema).parse(data ?? [])
}

export async function updateOrderStatus(orderId: string, nextStatus: OrderStatus) {
  const supabase = createSupabaseServerClient()
  const { ORDERFLOW_BUSINESS_ID } = getServerEnv()

  const { data: existingOrder, error: existingOrderError } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", orderId)
    .eq("business_id", ORDERFLOW_BUSINESS_ID)
    .maybeSingle()

  if (existingOrderError) {
    throw new Error(existingOrderError.message)
  }

  if (!existingOrder) {
    throw new Error("Order not found")
  }

  const currentStatus = z
    .enum(["pending", "making", "ready", "done", "cancelled"])
    .parse(existingOrder.status)

  if (!allowedTransitions[currentStatus].includes(nextStatus)) {
    throw new Error(`Invalid status transition from ${currentStatus} to ${nextStatus}`)
  }

  const now = new Date().toISOString()
  const updates: Record<string, string> = { status: nextStatus }

  if (nextStatus === "making") {
    updates.accepted_at = now
  }
  if (nextStatus === "ready") {
    updates.ready_at = now
  }
  if (nextStatus === "done") {
    updates.completed_at = now
  }

  const { error } = await supabase
    .from("orders")
    .update(updates)
    .eq("id", orderId)
    .eq("business_id", ORDERFLOW_BUSINESS_ID)

  if (error) {
    throw new Error(error.message)
  }
}
