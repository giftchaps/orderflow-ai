import "server-only"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import {
  type BusinessRecord,
  type ChecklistItem,
  type MenuCategory,
  type MenuDocument,
  type MenuItem,
  type PlanId,
  type StaffRecord,
  PLANS,
  SLUG_RE,
  TIMEZONES,
  buildSetupChecklist,
  countMenuItems,
  deriveBusinessStatus,
  slugify,
} from "@/lib/business-shared"

// Re-exported for server-only callers that already import these from here.
export type { BusinessRecord, ChecklistItem, MenuCategory, MenuDocument, MenuItem, PlanId, StaffRecord }
export { PLANS, SLUG_RE, TIMEZONES, buildSetupChecklist, countMenuItems, deriveBusinessStatus, slugify }

export const BUSINESS_SELECT =
  "id, name, slug, status, is_active, plan, owner_email, timezone, address, prep_time_minutes, phone_number, vapi_assistant_id, sms_from_number, ai_greeting, theme_color, menu, menu_published_at, display_pin, display_pin_hash, stripe_customer_id, stripe_subscription_id, subscription_status, current_period_end, created_at, updated_at"

/** Resilient select: tolerates databases where newer columns have not been migrated yet. */
export async function fetchBusiness(where: { id?: string; slug?: string }): Promise<BusinessRecord | null> {
  const supabase = createSupabaseServerClient()
  const run = (select: string) => {
    let q = supabase.from("businesses").select(select)
    if (where.id) q = q.eq("id", where.id)
    if (where.slug) q = q.eq("slug", where.slug)
    return q.maybeSingle()
  }

  let { data, error } = await run(BUSINESS_SELECT)
  if (error && /column/i.test(error.message)) {
    // Fallback to the legacy column set
    ;({ data, error } = await run(
      "id, name, slug, is_active, plan, owner_email, timezone, address, prep_time_minutes, phone_number, vapi_assistant_id, menu, display_pin, created_at, updated_at"
    ))
  }
  if (error) throw new Error(error.message)
  if (!data) return null

  const row = data as unknown as Partial<BusinessRecord> & { id: string; name: string; created_at: string }
  return {
    id: row.id,
    name: row.name,
    slug: row.slug ?? null,
    status: row.status ?? null,
    is_active: row.is_active ?? true,
    plan: row.plan ?? "starter",
    owner_email: row.owner_email ?? null,
    timezone: row.timezone ?? "America/New_York",
    address: row.address ?? null,
    prep_time_minutes: row.prep_time_minutes ?? 15,
    phone_number: row.phone_number ?? null,
    vapi_assistant_id: row.vapi_assistant_id ?? null,
    sms_from_number: row.sms_from_number ?? null,
    ai_greeting: row.ai_greeting ?? null,
    theme_color: row.theme_color ?? null,
    menu: (row.menu as MenuDocument | null) ?? null,
    menu_published_at: row.menu_published_at ?? null,
    display_pin: row.display_pin ?? null,
    display_pin_hash: row.display_pin_hash ?? null,
    stripe_customer_id: row.stripe_customer_id ?? null,
    stripe_subscription_id: row.stripe_subscription_id ?? null,
    subscription_status: row.subscription_status ?? null,
    current_period_end: row.current_period_end ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at ?? null,
  }
}

export async function fetchStaff(businessId: string): Promise<StaffRecord[]> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from("businesses_staff")
    .select("id, business_id, user_id, email, name, role, status, created_at")
    .eq("business_id", businessId)
    .order("created_at", { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as StaffRecord[]
}
