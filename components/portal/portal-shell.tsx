"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Eye, Moon, Sun, X } from "lucide-react"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Toaster } from "@/components/ui/sonner"
import { Button } from "@/components/ui/button"
import { AppSidebar } from "./app-sidebar"
import { BusinessStatusBadge } from "./status-badge"
import type { PortalUser } from "./types"
import { brandStyle } from "@/lib/color-contrast"
import { cn } from "@/lib/utils"

const THEME_STORAGE_KEY = "orderflow:portal-theme"

export function PortalShell({
  variant,
  user,
  themeColor,
  children,
}: {
  variant: "admin" | "business"
  user: PortalUser
  themeColor?: string | null
  children: React.ReactNode
}) {
  const activeMembership = user.memberships.find((m) => m.businessId === user.activeBusinessId)
  const businessStatus = activeMembership?.businessStatus

  const [dark, setDark] = useState(false)

  useEffect(() => {
    try {
      if (window.localStorage.getItem(THEME_STORAGE_KEY) === "dark") setDark(true)
    } catch {
      // localStorage unavailable (private browsing, etc.) — default to light.
    }
  }, [])

  const toggleDark = () => {
    setDark((prev) => {
      const next = !prev
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, next ? "dark" : "light")
      } catch {
        // Ignore — the preference just won't persist across reloads.
      }
      return next
    })
  }

  const themeStyle = brandStyle(themeColor)

  return (
    <div className={cn("theme-portal min-h-svh bg-background text-foreground", dark && "dark")} style={themeStyle}>
      <SidebarProvider>
        <AppSidebar variant={variant} user={user} dark={dark} themeColor={themeColor} />
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
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={toggleDark}
              title={dark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
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
