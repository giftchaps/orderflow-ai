"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { ChecklistItem, StaffRecord } from "@/lib/business-shared"
import type { AuditRow } from "@/lib/platform-shared"
import type { Order } from "@/lib/orders"
import type { BusinessStatus } from "@/lib/auth/session"
import { OverviewPanel } from "./overview-panel"
import { AgentPanel } from "./agent-panel"
import { TeamPanel } from "./team-panel"
import { DisplayPanel } from "./display-panel"
import { AccountPanel } from "./account-panel"
import { AuditFeed } from "@/components/admin/audit-feed"

export type AdminBusiness = {
  id: string
  name: string
  slug: string | null
  status: BusinessStatus
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
  menu: unknown
  menu_published_at: string | null
  created_at: string
  updated_at: string | null
  hasPin: boolean
}

const TABS = ["overview", "agent", "team", "display", "account", "activity"] as const
type Tab = (typeof TABS)[number]

export function BusinessDetailTabs({
  initialTab,
  business,
  staff,
  checklist,
  audit,
  activeOrders,
  displayUrl,
}: {
  initialTab?: string
  business: AdminBusiness
  staff: StaffRecord[]
  checklist: ChecklistItem[]
  audit: AuditRow[]
  activeOrders: Order[]
  displayUrl: string
}) {
  const router = useRouter()
  const params = useSearchParams()
  const current: Tab = TABS.includes(initialTab as Tab) ? (initialTab as Tab) : "overview"

  const setTab = (value: string) => {
    const next = new URLSearchParams(params.toString())
    if (value === "overview") next.delete("tab")
    else next.set("tab", value)
    next.delete("warning")
    router.replace(`?${next.toString()}`, { scroll: false })
  }

  return (
    <Tabs value={current} onValueChange={setTab} className="gap-6">
      <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-0">
        {TABS.map((t) => (
          <TabsTrigger
            key={t}
            value={t}
            className="rounded-md border border-transparent px-3 py-1.5 capitalize data-[state=active]:border-border data-[state=active]:bg-card data-[state=active]:shadow-none"
          >
            {t}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="overview">
        <OverviewPanel business={business} checklist={checklist} staff={staff} activeOrders={activeOrders} />
      </TabsContent>
      <TabsContent value="agent">
        <AgentPanel business={business} />
      </TabsContent>
      <TabsContent value="team">
        <TeamPanel business={business} staff={staff} />
      </TabsContent>
      <TabsContent value="display">
        <DisplayPanel business={business} displayUrl={displayUrl} />
      </TabsContent>
      <TabsContent value="account">
        <AccountPanel business={business} />
      </TabsContent>
      <TabsContent value="activity">
        <AuditFeed rows={audit} />
      </TabsContent>
    </Tabs>
  )
}
