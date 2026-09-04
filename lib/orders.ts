import { z } from "zod"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export const ORDER_STATUSES = ["pending", "making", "ready", "done", "cancelled"] as const
export const ORDER_CHANNELS = ["phone", "whatsapp_text", "whatsapp_voice", "sms", "web"] as const
export const ACTIVE_ORDER_STATUSES = ["pending", "making", "ready"] as const

const orderItemModSchema = z.object({
  type: z.enum(["add", "remove", "note"]),
  item: z.string(),
})

export const orderItemSchema = z.object({
  name: z.string(),
  qty: z.number().int().positive(),
  bread: z.string().nullable().optional(),
  mods: z.array(orderItemModSchema).optional(),
})

export const orderSchema = z.object({
  id: z.string().min(1),
  order_number: z.number().int(),
  status: z.enum(ORDER_STATUSES),
  channel: z.enum(ORDER_CHANNELS).catch("phone"),
  customer_phone: z.string().nullable().optional(),
  customer_name: z.string().nullable().optional(),
  total: z.coerce.number().nullable().optional(),
  placed_at: z.string(),
  items: z.array(orderItemSchema).catch([]),
  special_instructions: z.string().nullable().optional(),
})

export type Order = z.infer<typeof orderSchema>
export type OrderStatus = Order["status"]
export type OrderChannel = Order["channel"]
export type OrderItem = z.infer<typeof orderItemSchema>

export const ORDER_SELECT =
  "id, order_number, status, channel, customer_phone, customer_name, total, placed_at, items, special_instructions"

/** Legacy column set for databases that have not run the platform migration yet. */
export const ORDER_SELECT_LEGACY =
  "id, order_number, status, channel, customer_phone, placed_at, items, special_instructions"

/** Kitchen workflow: New -> Making -> Ready -> Done. Cancel is allowed before it is ready. */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["making", "cancelled"],
  making: ["ready", "cancelled"],
  ready: ["done"],
  done: [],
  cancelled: [],
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "New",
  making: "Making",
  ready: "Ready",
  done: "Done",
  cancelled: "Cancelled",
}

export const CHANNEL_LABEL: Record<OrderChannel, string> = {
  phone: "Phone",
  whatsapp_text: "WhatsApp",
  whatsapp_voice: "Voice note",
  sms: "SMS",
  web: "Web",
}

export async function listActiveOrders(businessId: string): Promise<Order[]> {
  const supabase = createSupabaseServerClient()
  const run = (select: string) =>
    supabase
      .from("orders")
      .select(select)
      .eq("business_id", businessId)
      .in("status", [...ACTIVE_ORDER_STATUSES])
      .order("placed_at", { ascending: true })

  let { data, error } = await run(ORDER_SELECT)
  if (error && /column/i.test(error.message)) ({ data, error } = await run(ORDER_SELECT_LEGACY))
  if (error) throw new Error(error.message)
  return z.array(orderSchema).parse(data ?? [])
}

export type OrderListFilter = {
  status?: OrderStatus | "active" | "all"
  from?: string
  to?: string
  limit?: number
}

/** Order history for one business, newest first. */
export async function listOrders(businessId: string, filter: OrderListFilter = {}): Promise<Order[]> {
  const supabase = createSupabaseServerClient()
  const run = (select: string) => {
    let q = supabase.from("orders").select(select).eq("business_id", businessId).order("placed_at", { ascending: false })
    if (filter.status === "active") q = q.in("status", [...ACTIVE_ORDER_STATUSES])
    else if (filter.status && filter.status !== "all") q = q.eq("status", filter.status)
    if (filter.from) q = q.gte("placed_at", filter.from)
    if (filter.to) q = q.lt("placed_at", filter.to)
    return q.limit(filter.limit ?? 100)
  }
  let { data, error } = await run(ORDER_SELECT)
  if (error && /column/i.test(error.message)) ({ data, error } = await run(ORDER_SELECT_LEGACY))
  if (error) throw new Error(error.message)
  return z.array(orderSchema).parse(data ?? [])
}

export type StatusActor = {
  type: "staff" | "display" | "platform_admin" | "system"
  userId?: string | null
  email?: string | null
}

export type UpdateOrderResult = {
  order: { id: string; order_number: number; customer_phone: string | null; status: OrderStatus }
  previousStatus: OrderStatus
}

/**
 * Transition an order. Enforces business scoping and the allowed state machine,
 * stamps lifecycle timestamps and appends an order_events row.
 */
export async function updateOrderStatus(
  businessId: string,
  orderId: string,
  nextStatus: OrderStatus,
  actor: StatusActor
): Promise<UpdateOrderResult> {
  const supabase = createSupabaseServerClient()

  const { data: existing, error: existingError } = await supabase
    .from("orders")
    .select("id, status, order_number, customer_phone")
    .eq("id", orderId)
    .eq("business_id", businessId)
    .maybeSingle()

  if (existingError) throw new Error(existingError.message)
  if (!existing) throw new Error("Order not found")

  const currentStatus = z.enum(ORDER_STATUSES).parse(existing.status)
  if (!ALLOWED_TRANSITIONS[currentStatus].includes(nextStatus)) {
    throw new Error(`Invalid status transition from ${currentStatus} to ${nextStatus}`)
  }

  const now = new Date().toISOString()
  const updates: Record<string, string> = { status: nextStatus, updated_at: now }
  if (nextStatus === "making") updates.accepted_at = now
  if (nextStatus === "ready") updates.ready_at = now
  if (nextStatus === "done" || nextStatus === "cancelled") updates.completed_at = now

  let { error } = await supabase.from("orders").update(updates).eq("id", orderId).eq("business_id", businessId)

  // Pre-migration databases may lack the timestamp columns: retry with status only.
  if (error && /column/i.test(error.message)) {
    ;({ error } = await supabase
      .from("orders")
      .update({ status: nextStatus })
      .eq("id", orderId)
      .eq("business_id", businessId))
  }
  if (error) throw new Error(error.message)

  // Append-only event log (ignored if the table is missing).
  await supabase
    .from("order_events")
    .insert({
      order_id: orderId,
      business_id: businessId,
      from_status: currentStatus,
      to_status: nextStatus,
      actor_type: actor.type,
      actor_user_id: actor.userId ?? null,
      actor_email: actor.email ?? null,
    })
    .then(({ error: evtError }) => {
      if (evtError && !/relation .* does not exist/i.test(evtError.message)) {
        console.error("[orders] order_events insert failed:", evtError.message)
      }
    })

  return {
    order: {
      id: existing.id,
      order_number: existing.order_number,
      customer_phone: existing.customer_phone ?? null,
      status: nextStatus,
    },
    previousStatus: currentStatus,
  }
}

export function summarizeItems(items: unknown, max = 3): string {
  if (!Array.isArray(items)) return "—"
  const parts = (items as OrderItem[]).map((i) => `${i.qty > 1 ? `${i.qty}× ` : ""}${i.name}`)
  if (parts.length <= max) return parts.join(", ")
  return `${parts.slice(0, max).join(", ")} +${parts.length - max} more`
}
