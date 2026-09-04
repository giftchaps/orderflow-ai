import { notFound } from "next/navigation"
import { requireBusinessContext } from "@/lib/auth/guards"
import { fetchBusiness } from "@/lib/business"
import { PageHeader } from "@/components/portal/page-header"
import { MenuManager } from "@/components/business/menu-manager"

export const metadata = { title: "Menu" }

export default async function MenuPage() {
  const ctx = await requireBusinessContext("menu.view")
  const business = await fetchBusiness({ id: ctx.businessId })
  if (!business) notFound()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Menu" description="What the phone agent can take orders for. Save to update the AI agent." />
      <MenuManager initialMenu={business.menu} canEdit={ctx.can("menu.edit")} />
    </div>
  )
}
