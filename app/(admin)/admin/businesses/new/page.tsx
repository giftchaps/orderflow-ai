import { PageHeader } from "@/components/portal/page-header"
import { OnboardingWizard } from "@/components/admin/onboarding-wizard"

export const metadata = { title: "Onboard business" }

export default function OnboardBusinessPage() {
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Businesses", href: "/admin/businesses" }, { label: "Onboard" }]}
        title="Onboard a business"
        description="Create the tenant, invite the owner and optionally load the menu. You can connect the phone agent afterwards."
      />
      <OnboardingWizard />
    </>
  )
}
