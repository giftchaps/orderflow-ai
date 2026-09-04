import type { Metadata } from "next"
import { requireBusinessContext } from "@/lib/auth/guards"
import { toPortalUser } from "@/lib/auth/portal-user"
import { PortalShell } from "@/components/portal/portal-shell"

export const metadata: Metadata = {
  title: { default: "Business portal", template: "%s · OrderFlow AI" },
}

export default async function BusinessLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireBusinessContext()
  return (
    <PortalShell variant="business" user={toPortalUser(ctx.session)}>
      {children}
    </PortalShell>
  )
}
