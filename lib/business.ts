import "server-only"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import type { BusinessStatus } from "@/lib/auth/session"

export const BUSINESS_SELECT =
  "id, name, slug, status, is_active, plan, owner_email, timezone, address, prep_time_minutes, phone_number, vapi_assistant_id, sms_from_number, ai_greeting, menu, menu_published_at, display_pin, display_pin_hash, created_at, updated_at"

export type BusinessRecord = {
  id: string
  name: string
  slug: string | null
  status: string | null
  is_active: boolean | null
  plan: string | null
  owner_email: string | null
  timezone: string | null
  address: string | null
  prep_time_minutes: number | null
  phone_number: string | null
  vapi_assistant_id: string | null
  sms_from_number: string | null
  ai_greeting: string | null
  menu: MenuDocument | null
  menu_published_at: string | null
  display_pin: string | null
  display_pin_hash: string | null
  created_at: string
  updated_at: string | null
}

export type MenuItem = {
  id?: string
  name: string
  aliases?: string[]
  description?: string
  active?: boolean
  prices?: Record<string, number>
}

export type MenuCategory = {
  id?: string
  name: string
  items: MenuItem[]
}

export type MenuDocument = {
  categories: MenuCategory[]
}

export type StaffRecord = {
  id: string
  business_id: string
  user_id: string | null
  email: string | null
  name: string | null
  role: string
  status: string | null
  created_at: string
}

export const PLANS = [
  { id: "starter", label: "Starter", price: "$49/mo", description: "Up to 100 orders per month" },
  { id: "growth", label: "Growth", price: "$99/mo", description: "Up to 500 orders per month" },
  { id: "pro", label: "Pro", price: "$149/mo", description: "Unlimited orders, priority support" },
] as const

export type PlanId = (typeof PLANS)[number]["id"]

export const TIMEZONES = [
  { value: "America/New_York", label: "Eastern (New York)" },
  { value: "America/Chicago", label: "Central (Chicago)" },
  { value: "America/Denver", label: "Mountain (Denver)" },
  { value: "America/Phoenix", label: "Arizona (Phoenix)" },
  { value: "America/Los_Angeles", label: "Pacific (Los Angeles)" },
  { value: "America/Anchorage", label: "Alaska" },
  { value: "Pacific/Honolulu", label: "Hawaii" },
]

export function deriveBusinessStatus(b: { status: string | null; is_active: boolean | null }): BusinessStatus {
  if (b.status === "draft" || b.status === "invited" || b.status === "active" || b.status === "suspended") {
    return b.status
  }
  return b.is_active === false ? "suspended" : "active"
}

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
    menu: (row.menu as MenuDocument | null) ?? null,
    menu_published_at: row.menu_published_at ?? null,
    display_pin: row.display_pin ?? null,
    display_pin_hash: row.display_pin_hash ?? null,
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

export function countMenuItems(menu: MenuDocument | null) {
  if (!menu?.categories) return { categories: 0, items: 0, active: 0 }
  let items = 0
  let active = 0
  for (const cat of menu.categories) {
    for (const item of cat.items ?? []) {
      items += 1
      if (item.active !== false) active += 1
    }
  }
  return { categories: menu.categories.length, items, active }
}

export type ChecklistItem = {
  key: "owner" | "menu" | "agent" | "phone" | "pin" | "staff"
  label: string
  description: string
  done: boolean
  href: string
  adminOnly?: boolean
}

/** Launch checklist shared by admin business detail and the business dashboard. */
export function buildSetupChecklist(
  business: BusinessRecord,
  staff: StaffRecord[],
  scope: "admin" | "business"
): ChecklistItem[] {
  const owner = staff.find((s) => s.role === "owner")
  const menu = countMenuItems(business.menu)
  const base = scope === "admin" ? `/admin/businesses/${business.slug}` : "/business"

  return [
    {
      key: "owner",
      label: "Owner account activated",
      description: owner?.user_id ? `${owner.email} has signed in.` : "Owner has not accepted the invite yet.",
      done: Boolean(owner?.user_id),
      href: scope === "admin" ? `${base}?tab=team` : "/business/staff",
    },
    {
      key: "menu",
      label: "Menu added",
      description: menu.items > 0 ? `${menu.active} active items in ${menu.categories} categories.` : "No menu items yet.",
      done: menu.items > 0,
      href: scope === "admin" ? `${base}?tab=menu` : "/business/menu",
    },
    {
      key: "phone",
      label: "Phone number assigned",
      description: business.phone_number ? business.phone_number : "Assign the Vapi phone number customers will call.",
      done: Boolean(business.phone_number),
      href: `${base}?tab=agent`,
      adminOnly: true,
    },
    {
      key: "agent",
      label: "AI agent connected",
      description: business.vapi_assistant_id ? "Vapi assistant linked." : "Link the Vapi assistant ID.",
      done: Boolean(business.vapi_assistant_id),
      href: `${base}?tab=agent`,
      adminOnly: true,
    },
    {
      key: "pin",
      label: "Kitchen display PIN set",
      description:
        business.display_pin_hash || business.display_pin ? "Display is PIN protected." : "Display is open to anyone with the link.",
      done: Boolean(business.display_pin_hash || business.display_pin),
      href: scope === "admin" ? `${base}?tab=display` : "/business/settings#display",
    },
    {
      key: "staff",
      label: "Team invited",
      description: staff.length > 1 ? `${staff.length} team members.` : "Invite managers and kitchen staff.",
      done: staff.length > 1,
      href: scope === "admin" ? `${base}?tab=team` : "/business/staff",
    },
  ].filter((item) => scope === "admin" || !item.adminOnly)
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
}

export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/
