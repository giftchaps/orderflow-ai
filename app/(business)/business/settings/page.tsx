import { notFound } from "next/navigation"
import { requireBusinessContext } from "@/lib/auth/guards"
import { buildSetupChecklist, fetchBusiness, fetchStaff } from "@/lib/business"
import { getAppUrl } from "@/lib/env"
import { PageHeader } from "@/components/portal/page-header"
import { SetupChecklist } from "@/components/portal/setup-checklist"
import { BusinessSettingsForm } from "@/components/business/settings-form"

export const metadata = { title: "Settings" }

export default async function SettingsPage() {
  const ctx = await requireBusinessContext("settings.view")
  const business = await fetchBusiness({ id: ctx.businessId })
  if (!business) notFound()

  const staff = await fetchStaff(ctx.businessId)
  const checklist = buildSetupChecklist(business, staff, "business")
  const displayUrl = business.slug ? `${getAppUrl()}/display/${business.slug}` : ""

  return (
    <>
      <PageHeader
        title="Settings"
        description="Business profile, kitchen display access and your launch checklist."
      />
      <SetupChecklist items={checklist} />
      <BusinessSettingsForm business={business} displayUrl={displayUrl} canEdit={ctx.can("settings.edit")} />
    </>
  )
}
