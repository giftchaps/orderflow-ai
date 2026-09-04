import Link from "next/link"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/portal/page-header"
import { BusinessTable } from "@/components/admin/business-table"
import { BusinessFilters } from "@/components/admin/business-filters"
import { listBusinesses } from "@/lib/platform"
import type { BusinessStatus } from "@/lib/auth/session"

export const metadata = { title: "Businesses" }

const STATUSES: (BusinessStatus | "all")[] = ["all", "active", "invited", "draft", "suspended"]

export default async function AdminBusinessesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>
}) {
  const params = await searchParams
  const status = (STATUSES.includes(params.status as BusinessStatus) ? params.status : "all") as BusinessStatus | "all"
  const q = params.q?.trim() || undefined

  const all = await listBusinesses({ q })
  const rows = status === "all" ? all : all.filter((r) => r.status === status)
  const counts = all.reduce<Record<string, number>>(
    (acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1
      return acc
    },
    { all: all.length }
  )

  return (
    <>
      <PageHeader
        title="Businesses"
        description="Every tenant on the platform. Open a business to manage its owner, agent, menu and display."
        actions={
          <Button asChild>
            <Link href="/admin/businesses/new">
              <Plus className="size-4" />
              Onboard business
            </Link>
          </Button>
        }
      />
      <BusinessFilters status={status} q={q ?? ""} counts={counts} />
      <BusinessTable rows={rows} />
    </>
  )
}
