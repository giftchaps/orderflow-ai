import type { BusinessStatus } from "@/lib/auth/session"

/**
 * Client-safe platform types and formatters. This module must not import
 * anything server-only — components rendered under a "use client" ancestor
 * (audit feed, business table, overview panel) import from here directly.
 * The Supabase-backed read helpers live in lib/platform.ts.
 */

export type BusinessListRow = {
  id: string
  name: string
  slug: string | null
  status: BusinessStatus
  plan: string | null
  owner_email: string | null
  phone_number: string | null
  vapi_assistant_id: string | null
  created_at: string
  orders_today: number
  active_orders: number
  owner_activated: boolean
}

export type AuditRow = {
  id: string
  action: string
  actor_type: string
  actor_email: string | null
  business_id: string | null
  target_type: string | null
  target_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export type PlatformAdminRow = {
  id: string
  email: string
  user_id: string | null
  name: string | null
  created_at: string
}

export function formatMoney(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(value)
}

export function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}
