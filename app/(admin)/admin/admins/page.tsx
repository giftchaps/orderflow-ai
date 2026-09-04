import { getSession } from "@/lib/auth/session"
import { listPlatformAdmins } from "@/lib/platform"
import { PageHeader } from "@/components/portal/page-header"
import { AdminsManager } from "@/components/admin/admins-manager"

export const metadata = { title: "Platform admins" }

export default async function AdminsPage() {
  const [session, admins] = await Promise.all([getSession(), listPlatformAdmins()])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Platform admins"
        description="People who can manage every business, review platform-wide activity, and configure the console."
      />
      <AdminsManager admins={admins} currentUserId={session?.user.id ?? null} />
    </div>
  )
}
