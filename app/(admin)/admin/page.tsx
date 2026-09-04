import Link from "next/link"
import { Activity, Building2, Inbox, Plus, Receipt, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader, Section } from "@/components/portal/page-header"
import { StatCard, StatGrid } from "@/components/portal/stat-card"
import { BusinessTable } from "@/components/admin/business-table"
import { AuditFeed } from "@/components/admin/audit-feed"
import { formatMoney, getPlatformStats, listAuditLogs, listBusinesses } from "@/lib/platform"

export const metadata = { title: "Overview" }

export default async function AdminOverviewPage() {
  const [stats, businesses, audit] = await Promise.all([
    getPlatformStats(),
    listBusinesses(),
    listAuditLogs({ limit: 12 }),
  ])

  const needsAttention = businesses.filter((b) => b.status === "invited" || b.status === "draft")
  const recent = businesses.slice(0, 8)

  return (
    <>
      <PageHeader
        title="Platform overview"
        description="Every tenant on OrderFlow, what they are doing right now, and what still needs your attention."
        actions={
          <Button asChild>
            <Link href="/admin/businesses/new">
              <Plus className="size-4" />
              Onboard business
            </Link>
          </Button>
        }
      />

      <StatGrid>
        <StatCard
          label="Live businesses"
          value={stats.businesses.active}
          hint={`${stats.businesses.total} total · ${stats.businesses.newThisMonth} new this month`}
          icon={Building2}
          href="/admin/businesses?status=active"
        />
        <StatCard
          label="Orders today"
          value={stats.orders.today}
          hint={`${formatMoney(stats.orders.revenueToday)} across all tenants`}
          icon={Receipt}
          href="/admin/orders"
        />
        <StatCard
          label="In kitchens now"
          value={stats.orders.activeNow}
          hint="Pending, making or ready"
          icon={Activity}
          tone={stats.orders.activeNow > 0 ? "brand" : "default"}
          href="/admin/orders?status=active"
        />
        <StatCard
          label="Awaiting action"
          value={stats.pendingInvites + stats.newDemoRequests}
          hint={`${stats.pendingInvites} pending invites · ${stats.newDemoRequests} new demo requests`}
          icon={Inbox}
          tone={stats.pendingInvites + stats.newDemoRequests > 0 ? "warning" : "default"}
          href={stats.newDemoRequests > 0 ? "/admin/demo-requests" : "/admin/businesses?status=invited"}
        />
      </StatGrid>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-6">
          {needsAttention.length > 0 && (
            <Section
              title="Onboarding in progress"
              description="Businesses that have been created but are not live yet."
              actions={
                <Button asChild variant="ghost" size="sm">
                  <Link href="/admin/businesses?status=invited">View all</Link>
                </Button>
              }
            >
              <BusinessTable rows={needsAttention.slice(0, 5)} compact />
            </Section>
          )}

          <Section
            title="Recently added"
            actions={
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/businesses">All businesses</Link>
              </Button>
            }
          >
            <BusinessTable rows={recent} />
          </Section>
        </div>

        <Section
          title="Activity"
          description="Latest administrative actions across the platform."
          actions={
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/system#audit">Audit log</Link>
            </Button>
          }
        >
          <AuditFeed rows={audit} showBusiness />
          {stats.pendingInvites > 0 && (
            <Link
              href="/admin/businesses?status=invited"
              className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm hover:border-foreground/20"
            >
              <UserPlus className="size-4 text-warning-foreground" />
              <span className="flex-1">
                {stats.pendingInvites} staff invite{stats.pendingInvites === 1 ? "" : "s"} not yet accepted
              </span>
            </Link>
          )}
        </Section>
      </div>
    </>
  )
}
