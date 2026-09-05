import { PageHeader } from "@/components/portal/page-header"
import { OnboardingWizard } from "@/components/admin/onboarding-wizard"
import { fetchPlanTiers } from "@/lib/plans"

export const dynamic = "force-dynamic"
export const metadata = { title: "Onboard business" }

export default async function OnboardBusinessPage() {
  const planTiers = await fetchPlanTiers()
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Businesses", href: "/admin/businesses" }, { label: "Onboard" }]}
        title="Onboard a business"
        description="Create the tenant, invite the owner and optionally load the menu. You can connect the phone agent afterwards."
      />
      <OnboardingWizard planTiers={planTiers} />
    </>
  )
}
