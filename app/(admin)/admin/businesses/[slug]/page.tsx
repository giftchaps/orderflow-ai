import Link from "next/link"
import { notFound } from "next/navigation"
import { ExternalLink, Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/portal/page-header"
import { BusinessStatusBadge } from "@/components/portal/status-badge"
import { buildSetupChecklist, deriveBusinessStatus, fetchBusiness, fetchStaff } from "@/lib/business"
import { fetchPlanTiers, countOrdersThisMonth } from "@/lib/plans"
import { listAuditLogs } from "@/lib/platform"
import { listActiveOrders } from "@/lib/orders-server"
import { getAppUrl } from "@/lib/env"
import { BusinessDetailTabs } from "@/components/admin/business-detail/tabs"

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ tab?: string; warning?: string }>
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const business = await fetchBusiness({ slug })
  return { title: business ? business.name : "Business" }
}

export default async function AdminBusinessDetailPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { tab, warning } = await searchParams

  const business = await fetchBusiness({ slug })
  if (!business) notFound()

  const [staff, audit, activeOrders, planTiers, ordersThisMonth] = await Promise.all([
    fetchStaff(business.id),
    listAuditLogs({ businessId: business.id, limit: 30 }),
    listActiveOrders(business.id),
    fetchPlanTiers(),
    countOrdersThisMonth(business.id),
  ])

  const status = deriveBusinessStatus(business)
  const checklist = buildSetupChecklist(business, staff, "admin")
  const displayUrl = `${getAppUrl()}/display/${business.slug}`

  // business.owner_email is a denormalized field set at onboarding time; it's
  // frequently empty for businesses created before that flow existed (or
  // edited outside it), even though a real owner exists in businesses_staff.
  // Fall back to the live staff record so the header never contradicts the
  // Overview panel below it, which already derives the owner this way.
  const ownerOfRecord = staff.find((s) => s.role === "owner")
  const ownerLabel = business.owner_email ?? ownerOfRecord?.email ?? ownerOfRecord?.name ?? "No owner"

  const { display_pin, display_pin_hash, ...safeBusiness } = business

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Businesses", href: "/admin/businesses" }, { label: business.name }]}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {business.name}
            <BusinessStatusBadge status={status} />
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>/{business.slug}</span>
            <span aria-hidden>·</span>
            <span className="capitalize">{business.plan ?? "starter"} plan</span>
            <span aria-hidden>·</span>
            <span>{ownerLabel}</span>
          </span>
        }
        actions={
          <>
            <Button asChild variant="outline">
              <a href={displayUrl} target="_blank" rel="noreferrer">
                <Monitor className="size-4" />
                Kitchen display
              </a>
            </Button>
            <Button asChild>
              <a href={`/api/admin/view-business?business=${business.id}`}>
                <ExternalLink className="size-4" />
                Open business portal
              </a>
            </Button>
          </>
        }
      />

      {warning && (
        <p role="status" className="rounded-lg border border-warning/40 bg-status-pending-bg px-4 py-3 text-sm text-warning-foreground">
          {warning}
        </p>
      )}

      <BusinessDetailTabs
        initialTab={tab}
        business={{ ...safeBusiness, hasPin: Boolean(display_pin || display_pin_hash), status }}
        staff={staff}
        checklist={checklist}
        audit={audit}
        activeOrders={activeOrders}
        displayUrl={displayUrl}
        planTiers={planTiers}
        ordersThisMonth={ordersThisMonth}
      />

      <p className="text-xs text-muted-foreground">
        Looking for the live dashboard, orders or analytics?{" "}
        <Link href={`/api/admin/view-business?business=${business.id}`} className="underline">
          Open the business portal
        </Link>{" "}
        to see exactly what the owner sees.
      </p>
    </>
  )
}
