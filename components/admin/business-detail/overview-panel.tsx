import { Card } from "@/components/ui/card"
import { SetupChecklist } from "@/components/portal/setup-checklist"
import { OrderStatusBadge } from "@/components/portal/status-badge"
import { EmptyState } from "@/components/portal/empty-state"
import { ClipboardList } from "lucide-react"
import type { ChecklistItem, StaffRecord } from "@/lib/business-shared"
import { countMenuItems, type MenuDocument } from "@/lib/business-shared"
import { CHANNEL_LABEL, summarizeItems, type Order } from "@/lib/orders"
import { formatRelative } from "@/lib/platform-shared"
import type { AdminBusiness } from "./tabs"

export function OverviewPanel({
  business,
  checklist,
  staff,
  activeOrders,
}: {
  business: AdminBusiness
  checklist: ChecklistItem[]
  staff: StaffRecord[]
  activeOrders: Order[]
}) {
  const menu = countMenuItems(business.menu as MenuDocument | null)
  const owner = staff.find((s) => s.role === "owner")

  const facts: { label: string; value: React.ReactNode }[] = [
    { label: "Owner", value: owner ? `${owner.name ?? owner.email}${owner.user_id ? "" : " (invite pending)"}` : "—" },
    { label: "Team", value: `${staff.length} member${staff.length === 1 ? "" : "s"}` },
    { label: "Menu", value: menu.items ? `${menu.active} active items · ${menu.categories} categories` : "Not added" },
    { label: "Prep time", value: `${business.prep_time_minutes ?? 15} min` },
    { label: "Timezone", value: business.timezone ?? "—" },
    { label: "Address", value: business.address ?? "—" },
    { label: "Created", value: new Date(business.created_at).toLocaleDateString() },
    { label: "Last updated", value: business.updated_at ? formatRelative(business.updated_at) : "—" },
  ]

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex flex-col gap-6">
        <Card className="flex flex-col gap-4 p-5 shadow-none">
          <p className="font-medium">Business profile</p>
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            {facts.map((f) => (
              <div key={f.label} className="flex flex-col gap-0.5">
                <dt className="text-xs text-muted-foreground">{f.label}</dt>
                <dd className="text-pretty">{f.value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card className="flex flex-col gap-4 p-5 shadow-none">
          <div className="flex items-center justify-between">
            <p className="font-medium">In the kitchen now</p>
            <span className="text-sm text-muted-foreground">{activeOrders.length} active</span>
          </div>
          {activeOrders.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No active orders" description="Orders appear here while they are pending, being made, or ready." className="py-8" />
          ) : (
            <ul className="flex flex-col divide-y">
              {activeOrders.slice(0, 8).map((o) => (
                <li key={o.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className="w-12 font-mono text-xs text-muted-foreground">#{o.order_number}</span>
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium">{o.customer_name ?? "Guest"}</span>
                    <span className="text-muted-foreground"> · {summarizeItems(o.items)}</span>
                  </span>
                  <span className="hidden text-xs text-muted-foreground sm:inline">{CHANNEL_LABEL[o.channel]}</span>
                  <OrderStatusBadge status={o.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <SetupChecklist items={checklist} />
    </div>
  )
}
