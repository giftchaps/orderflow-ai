import type { Metadata } from "next"
import { requirePlatformAdmin } from "@/lib/auth/guards"
import { toPortalUser } from "@/lib/auth/portal-user"
import { PortalShell } from "@/components/portal/portal-shell"

export const metadata: Metadata = {
  title: { default: "Platform console", template: "%s · OrderFlow AI" },
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePlatformAdmin()
  return (
    <PortalShell variant="admin" user={toPortalUser(session)}>
      {children}
    </PortalShell>
  )
}
