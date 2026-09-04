import Link from "next/link"
import { Eye, X } from "lucide-react"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Toaster } from "@/components/ui/sonner"
import { Button } from "@/components/ui/button"
import { AppSidebar } from "./app-sidebar"
import { BusinessStatusBadge } from "./status-badge"
import type { PortalUser } from "./types"

export function PortalShell({
  variant,
  user,
  children,
}: {
  variant: "admin" | "business"
  user: PortalUser
  children: React.ReactNode
}) {
  const activeMembership = user.memberships.find((m) => m.businessId === user.activeBusinessId)
  const businessStatus = activeMembership?.businessStatus

  return (
    <div className="theme-portal min-h-svh bg-background text-foreground">
      <SidebarProvider>
        <AppSidebar variant={variant} user={user} />
        <SidebarInset className="bg-background">
          <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="flex min-w-0 flex-1 items-center gap-3 text-sm">
              <span className="truncate font-medium">
                {variant === "admin" ? "Platform console" : user.activeBusinessName ?? "Business"}
              </span>
              {variant === "business" && businessStatus && businessStatus !== "active" && (
                <BusinessStatusBadge status={businessStatus} compact />
              )}
            </div>
          </header>

          {variant === "business" && user.viewingAsAdmin && (
            <div className="flex items-center gap-3 border-b border-warning/40 bg-status-pending-bg px-4 py-2 text-sm text-warning-foreground">
              <Eye className="size-4 shrink-0" />
              <p className="min-w-0 flex-1 text-pretty">
                You are viewing <strong>{user.activeBusinessName}</strong> as a platform administrator. Changes you make
                here are recorded in the audit log.
              </p>
              <Button asChild size="sm" variant="ghost" className="h-7 gap-1 text-warning-foreground hover:bg-warning/20">
                <Link href="/api/admin/view-business?exit=1">
                  <X className="size-3.5" />
                  Exit
                </Link>
              </Button>
            </div>
          )}

          {variant === "business" && businessStatus === "suspended" && (
            <div className="border-b border-destructive/30 bg-status-making-bg px-4 py-2 text-sm text-destructive">
              This business is suspended. The phone agent and kitchen display are paused until a platform administrator
              reactivates it.
            </div>
          )}

          <main className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">{children}</main>
        </SidebarInset>
      </SidebarProvider>
      <Toaster richColors position="bottom-right" />
    </div>
  )
}
