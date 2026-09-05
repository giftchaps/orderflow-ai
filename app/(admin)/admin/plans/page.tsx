import { fetchPlanTiers } from "@/lib/plans"
import { PageHeader } from "@/components/portal/page-header"
import { PlansManager } from "@/components/admin/plans-manager"

export const dynamic = "force-dynamic"
export const metadata = { title: "Plans" }

export default async function PlansPage() {
  const tiers = await fetchPlanTiers()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Plans"
        description="What Starter, Growth and Pro actually cost and include. Changing a row here changes it for every business on that plan immediately — no redeploy needed."
      />
      <PlansManager tiers={tiers} />
    </div>
  )
}
