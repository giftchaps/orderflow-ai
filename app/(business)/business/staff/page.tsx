import { requireBusinessContext } from "@/lib/auth/guards"
import { fetchStaff } from "@/lib/business"
import { PageHeader } from "@/components/portal/page-header"
import { StaffPanel } from "@/components/business/staff-panel"

export const metadata = { title: "Team" }

export default async function StaffPage() {
  const ctx = await requireBusinessContext("staff.view")
  const staff = await fetchStaff(ctx.businessId)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Team" description="Invite staff and managers, and manage who has access to this business." />
      <StaffPanel staff={staff} role={ctx.role} currentUserId={ctx.session.user.id} />
    </div>
  )
}
