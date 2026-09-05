import { notFound } from "next/navigation"
import { requireBusinessContext } from "@/lib/auth/guards"
import { buildSetupChecklist, fetchBusiness, fetchStaff } from "@/lib/business"
import { fetchPlanTiers, countOrdersThisMonth } from "@/lib/plans"
import { getAppUrl } from "@/lib/env"
import { PageHeader } from "@/components/portal/page-header"
import { SetupChecklist } from "@/components/portal/setup-checklist"
import { BusinessSettingsForm } from "@/components/business/settings-form"
import { BillingPanel } from "@/components/business/billing-panel"

export const metadata = { title: "Settings" }

export default async function SettingsPage() {
  const ctx = await requireBusinessContext("settings.view")
  const business = await fetchBusiness({ id: ctx.businessId })
  if (!business) notFound()

  const [staff, planTiers, ordersThisMonth] = await Promise.all([
    fetchStaff(ctx.businessId),
    fetchPlanTiers(),
    countOrdersThisMonth(ctx.businessId),
  ])
  const checklist = buildSetupChecklist(business, staff, "business")
  const displayUrl = business.slug ? `${getAppUrl()}/display/${business.slug}` : ""

  return (
    <>
      <PageHeader
        title="Settings"
        description="Business profile, kitchen display access and your launch checklist."
      />
      <SetupChecklist items={checklist} />
      <BillingPanel
        plan={business.plan}
        planTiers={planTiers}
        subscriptionStatus={business.subscription_status}
        currentPeriodEnd={business.current_period_end}
        ordersThisMonth={ordersThisMonth}
        canManage={ctx.can("billing.manage")}
      />
      <BusinessSettingsForm business={business} displayUrl={displayUrl} canEdit={ctx.can("settings.edit")} />
    </>
  )
}
