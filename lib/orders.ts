import { z } from "zod"

/**
 * Client-safe order types, schemas and constants. This module must not import
 * anything server-only (e.g. lib/supabase/server) — client components such as
 * the kitchen display and status badges import from here directly. The
 * Supabase-backed read/write helpers live in lib/orders-server.ts.
 */

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

export function summarizeItems(items: unknown, max = 3): string {
  if (!Array.isArray(items)) return "—"
  const parts = (items as OrderItem[]).map((i) => `${i.qty > 1 ? `${i.qty}× ` : ""}${i.name}`)
  if (parts.length <= max) return parts.join(", ")
  return `${parts.slice(0, max).join(", ")} +${parts.length - max} more`
}
