import "server-only"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { PLAN_IDS, type PlanId, type PlanTier } from "@/lib/business-shared"

const PLAN_TIERS_SELECT =
  "id, label, price_cents, monthly_order_limit, staff_seat_limit, priority_support, stripe_price_id, sort_order"

function toPlanTier(row: {
  id: string
  label: string
  price_cents: number
  monthly_order_limit: number | null
  staff_seat_limit: number | null
  priority_support: boolean
  stripe_price_id: string | null
  sort_order: number
}): PlanTier {
  return {
    id: row.id as PlanId,
    label: row.label,
    priceCents: row.price_cents,
    monthlyOrderLimit: row.monthly_order_limit,
    staffSeatLimit: row.staff_seat_limit,
    prioritySupport: row.priority_support,
    stripePriceId: row.stripe_price_id,
    sortOrder: row.sort_order,
  }
}

/** All three plan tiers, in display order. Falls back to sane defaults if the migration hasn't run yet. */
export async function fetchPlanTiers(): Promise<PlanTier[]> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase.from("plan_tiers").select(PLAN_TIERS_SELECT).order("sort_order", { ascending: true })
  if (error) {
    console.error("[plans] failed to load plan_tiers, using fallback defaults:", error.message)
    return FALLBACK_TIERS
  }
  if (!data || data.length === 0) return FALLBACK_TIERS
  return data.map(toPlanTier)
}

export async function fetchPlanTier(id: PlanId): Promise<PlanTier | null> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase.from("plan_tiers").select(PLAN_TIERS_SELECT).eq("id", id).maybeSingle()
  if (error) throw new Error(error.message)
  return data ? toPlanTier(data) : FALLBACK_TIERS.find((t) => t.id === id) ?? null
}

export type PlanTierPatch = Partial<{
  label: string
  priceCents: number
  monthlyOrderLimit: number | null
  staffSeatLimit: number | null
  prioritySupport: boolean
  stripePriceId: string | null
}>

export async function updatePlanTier(id: PlanId, patch: PlanTierPatch): Promise<void> {
  const supabase = createSupabaseServerClient()
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.label !== undefined) updates.label = patch.label
  if (patch.priceCents !== undefined) updates.price_cents = patch.priceCents
  if (patch.monthlyOrderLimit !== undefined) updates.monthly_order_limit = patch.monthlyOrderLimit
  if (patch.staffSeatLimit !== undefined) updates.staff_seat_limit = patch.staffSeatLimit
  if (patch.prioritySupport !== undefined) updates.priority_support = patch.prioritySupport
  if (patch.stripePriceId !== undefined) updates.stripe_price_id = patch.stripePriceId

  const { error } = await supabase.from("plan_tiers").update(updates).eq("id", id)
  if (error) throw new Error(error.message)
}

/** The Stripe Price id a plan should charge. Throws with a message that points at Admin -> Plans. */
export async function priceIdForPlan(plan: PlanId): Promise<string> {
  const tier = await fetchPlanTier(plan)
  if (!tier?.stripePriceId) {
    throw new Error(`No Stripe price is configured for the "${plan}" plan yet. Set one in Admin -> Plans.`)
  }
  return tier.stripePriceId
}

/** Reverse lookup used by the Stripe webhook to figure out which plan a subscription's price maps to. */
export async function planForPriceId(priceId: string): Promise<PlanId | null> {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase.from("plan_tiers").select("id").eq("stripe_price_id", priceId).maybeSingle()
  return (data?.id as PlanId | undefined) ?? null
}

/** How many orders a business has placed since the start of the current calendar month. */
export async function countOrdersThisMonth(businessId: string): Promise<number> {
  const supabase = createSupabaseServerClient()
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const { count, error } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("business_id", businessId)
    .gte("placed_at", monthStart)
  if (error) {
    console.error("[plans] failed to count monthly orders:", error.message)
    return 0
  }
  return count ?? 0
}

/** How many active (non-disabled) staff seats a business currently has filled. */
export async function countActiveStaff(businessId: string): Promise<number> {
  const supabase = createSupabaseServerClient()
  const { count, error } = await supabase
    .from("businesses_staff")
    .select("*", { count: "exact", head: true })
    .eq("business_id", businessId)
    .neq("status", "disabled")
  if (error) {
    console.error("[plans] failed to count staff:", error.message)
    return 0
  }
  return count ?? 0
}

// Used only if plan_tiers is empty/unmigrated -- keeps the app rendering
// with the same numbers that used to be hardcoded, rather than crashing.
const FALLBACK_TIERS: PlanTier[] = [
  { id: "starter", label: "Starter", priceCents: 4900, monthlyOrderLimit: 100, staffSeatLimit: null, prioritySupport: false, stripePriceId: null, sortOrder: 1 },
  { id: "growth", label: "Growth", priceCents: 9900, monthlyOrderLimit: 500, staffSeatLimit: null, prioritySupport: false, stripePriceId: null, sortOrder: 2 },
  { id: "pro", label: "Pro", priceCents: 14900, monthlyOrderLimit: null, staffSeatLimit: null, prioritySupport: true, stripePriceId: null, sortOrder: 3 },
]

export { PLAN_IDS }
export type { PlanId, PlanTier }
