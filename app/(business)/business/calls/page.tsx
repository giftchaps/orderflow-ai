import { requireBusinessContext } from "@/lib/auth/guards"
import { fetchCalls } from "@/lib/calls"
import { PageHeader } from "@/components/portal/page-header"
import { CallLogTable } from "@/components/portal/call-log-table"

export const dynamic = "force-dynamic"
export const metadata = { title: "Calls" }

export default async function BusinessCallsPage() {
  const ctx = await requireBusinessContext("orders.view")
  const calls = await fetchCalls(ctx.businessId)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Calls"
        description="Every call your phone agent has handled — recording, transcript and a short summary, whether or not it became an order."
      />
      <CallLogTable calls={calls} />
    </div>
  )
}
