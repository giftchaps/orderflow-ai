import "server-only"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { deriveBusinessStatus } from "@/lib/business"
import type { BusinessStatus } from "@/lib/auth/session"
import { type BusinessListRow, type AuditRow, type PlatformAdminRow, formatMoney, formatRelative } from "@/lib/platform-shared"

// Re-exported for server-only callers that already import these from here.
export type { BusinessListRow, AuditRow, PlatformAdminRow }
export { formatMoney, formatRelative }

function startOfToday() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
}

/** Businesses with per-tenant counts. Uses a few round-trips but stays index-friendly. */
export async function listBusinesses(filter?: { status?: BusinessStatus | "all"; q?: string }): Promise<BusinessListRow[]> {
  const supabase = createSupabaseServerClient()

  let query = supabase
    .from("businesses")
    .select("id, name, slug, status, is_active, plan, owner_email, phone_number, vapi_assistant_id, created_at")
    .order("created_at", { ascending: false })

  if (filter?.q) {
    const q = filter.q.replace(/[%,]/g, "")
    query = query.or(`name.ilike.%${q}%,slug.ilike.%${q}%,owner_email.ilike.%${q}%`)
  }

  const { data: businesses, error } = await query
  if (error) throw new Error(error.message)

  const ids = (businesses ?? []).map((b) => b.id)
  if (ids.length === 0) return []

  const [{ data: todayOrders }, { data: activeOrders }, { data: owners }] = await Promise.all([
    supabase.from("orders").select("business_id").in("business_id", ids).gte("placed_at", startOfToday()),
    supabase.from("orders").select("business_id").in("business_id", ids).in("status", ["pending", "making", "ready"]),
    supabase.from("businesses_staff").select("business_id, user_id").in("business_id", ids).eq("role", "owner"),
  ])

  const count = (rows: { business_id: string }[] | null) => {
    const m = new Map<string, number>()
    for (const r of rows ?? []) m.set(r.business_id, (m.get(r.business_id) ?? 0) + 1)
    return m
  }
  const today = count(todayOrders)
  const active = count(activeOrders)
  const activatedOwners = new Set((owners ?? []).filter((o) => o.user_id).map((o) => o.business_id))

  const rows: BusinessListRow[] = (businesses ?? []).map((b) => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    status: deriveBusinessStatus(b),
    plan: b.plan,
    owner_email: b.owner_email,
    phone_number: b.phone_number,
    vapi_assistant_id: b.vapi_assistant_id,
    created_at: b.created_at,
    orders_today: today.get(b.id) ?? 0,
    active_orders: active.get(b.id) ?? 0,
    owner_activated: activatedOwners.has(b.id),
  }))

  if (filter?.status && filter.status !== "all") return rows.filter((r) => r.status === filter.status)
  return rows
}

export type PlatformStats = {
  businesses: { total: number; active: number; invited: number; suspended: number; draft: number; newThisMonth: number }
  orders: { today: number; week: number; activeNow: number; revenueToday: number }
  pendingInvites: number
  newDemoRequests: number
}

export async function getPlatformStats(): Promise<PlatformStats> {
  const supabase = createSupabaseServerClient()
  const now = new Date()
  const todayStart = startOfToday()
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [
    { data: businesses },
    { count: ordersToday },
    { count: ordersWeek },
    { count: activeNow },
    todayRevenue,
    { count: pendingInvites },
    { count: demoRequests },
  ] = await Promise.all([
    supabase.from("businesses").select("id, status, is_active, created_at"),
    supabase.from("orders").select("*", { count: "exact", head: true }).gte("placed_at", todayStart),
    supabase.from("orders").select("*", { count: "exact", head: true }).gte("placed_at", weekStart),
    supabase.from("orders").select("*", { count: "exact", head: true }).in("status", ["pending", "making", "ready"]),
    supabase
      .from("orders")
      .select("total")
      .gte("placed_at", todayStart)
      .neq("status", "cancelled")
      .then((r) => (r.error ? { data: [] as { total: number | null }[] } : r)),
    supabase.from("businesses_staff").select("*", { count: "exact", head: true }).is("user_id", null),
    supabase
      .from("demo_requests")
      .select("*", { count: "exact", head: true })
      .then((r) => (r.error ? { count: 0 } : r)),
  ])
  const todayRevenueRows = todayRevenue.data

  const byStatus = { active: 0, invited: 0, suspended: 0, draft: 0 }
  let newThisMonth = 0
  for (const b of businesses ?? []) {
    byStatus[deriveBusinessStatus(b)] += 1
    if (b.created_at >= monthStart) newThisMonth += 1
  }

  return {
    businesses: { total: businesses?.length ?? 0, ...byStatus, newThisMonth },
    orders: {
      today: ordersToday ?? 0,
      week: ordersWeek ?? 0,
      activeNow: activeNow ?? 0,
      revenueToday: (todayRevenueRows ?? []).reduce((sum, r) => sum + Number(r.total ?? 0), 0),
    },
    pendingInvites: pendingInvites ?? 0,
    newDemoRequests: demoRequests ?? 0,
  }
}

export async function listAuditLogs(opts: { businessId?: string; limit?: number } = {}): Promise<AuditRow[]> {
  const supabase = createSupabaseServerClient()
  let q = supabase
    .from("audit_logs")
    .select("id, action, actor_type, actor_email, business_id, target_type, target_id, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 50)
  if (opts.businessId) q = q.eq("business_id", opts.businessId)
  const { data, error } = await q
  if (error) {
    // Table may not exist yet on older databases; degrade gracefully.
    if (/relation .* does not exist/i.test(error.message)) return []
    throw new Error(error.message)
  }
  return (data ?? []) as AuditRow[]
}

export async function listPlatformAdmins(): Promise<PlatformAdminRow[]> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from("platform_admins")
    .select("id, email, user_id, name, created_at")
    .order("created_at", { ascending: true })
  if (error) {
    if (/relation .* does not exist/i.test(error.message)) return []
    throw new Error(error.message)
  }
  return (data ?? []) as PlatformAdminRow[]
}
