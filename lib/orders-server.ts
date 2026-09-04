import "server-only"

import { z } from "zod"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import {
  ACTIVE_ORDER_STATUSES,
  ALLOWED_TRANSITIONS,
  ORDER_SELECT,
  ORDER_SELECT_LEGACY,
  ORDER_STATUSES,
  orderSchema,
  type Order,
  type OrderStatus,
} from "@/lib/orders"

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
