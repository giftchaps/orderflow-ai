"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import {
  LayoutDashboard,
  Building2,
  ClipboardList,
  Inbox,
  ShieldCheck,
  Activity,
  UtensilsCrossed,
  Users,
  BarChart3,
  Settings,
  MonitorPlay,
  CreditCard,
  PhoneCall,
  LogOut,
  ChevronsUpDown,
  Check,
  ArrowLeftRight,
  Plus,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { createClient } from "@/lib/supabase/client"
import { ROLE_LABEL, type Permission } from "@/lib/auth/permissions"
import { cn } from "@/lib/utils"
import { brandStyle } from "@/lib/color-contrast"
import type { PortalUser } from "./types"
import { BusinessStatusBadge } from "./status-badge"

type NavItem = {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  permission?: Permission
  exact?: boolean
}

const ADMIN_NAV: NavItem[] = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard, exact: true },
  { label: "Businesses", href: "/admin/businesses", icon: Building2 },
  { label: "Orders", href: "/admin/orders", icon: ClipboardList },
  { label: "Demo requests", href: "/admin/demo-requests", icon: Inbox },
  { label: "Plans", href: "/admin/plans", icon: CreditCard },
  { label: "Platform admins", href: "/admin/admins", icon: ShieldCheck },
  { label: "System health", href: "/admin/system", icon: Activity },
]

const BUSINESS_NAV: NavItem[] = [
  { label: "Overview", href: "/business", icon: LayoutDashboard, exact: true },
  { label: "Orders", href: "/business/orders", icon: ClipboardList, permission: "orders.view" },
  { label: "Calls", href: "/business/calls", icon: PhoneCall, permission: "orders.view" },
  { label: "Menu", href: "/business/menu", icon: UtensilsCrossed, permission: "menu.view" },
  { label: "Team", href: "/business/staff", icon: Users, permission: "staff.view" },
  { label: "Analytics", href: "/business/analytics", icon: BarChart3, permission: "analytics.view" },
  { label: "Settings", href: "/business/settings", icon: Settings, permission: "settings.view" },
]

export function AppSidebar({
  variant,
  user,
  dark,
  themeColor,
}: {
  variant: "admin" | "business"
  user: PortalUser
  dark?: boolean
  themeColor?: string | null
}) {
  const pathname = usePathname()
  const items =
    variant === "admin"
      ? ADMIN_NAV
      : BUSINESS_NAV.filter((item) => !item.permission || user.permissions.includes(item.permission))

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`)

  return (
    <Sidebar collapsible="icon" className={cn("theme-portal", dark && "dark")} style={brandStyle(themeColor)}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip="OrderFlow AI">
              <Link href={variant === "admin" ? "/admin" : "/business"}>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand text-brand-foreground">
                  <UtensilsCrossed className="size-4" />
                </span>
                <span className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-semibold">OrderFlow AI</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {variant === "admin" ? "Platform console" : "Business portal"}
                  </span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {variant === "business" && <BusinessSwitcher user={user} />}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{variant === "admin" ? "Platform" : "Workspace"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActive(item)} tooltip={item.label}>
                    <Link href={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {variant === "business" && user.activeBusinessSlug && (
          <SidebarGroup>
            <SidebarGroupLabel>Kitchen</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Open kitchen display">
                    <a href={`/display/${user.activeBusinessSlug}`} target="_blank" rel="noreferrer">
                      <MonitorPlay className="size-4" />
                      <span>Open kitchen display</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {variant === "business" && user.isPlatformAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Platform</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Back to platform console">
                    <Link href="/admin">
                      <ArrowLeftRight className="size-4" />
                      <span>Platform console</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {variant === "admin" && user.memberships.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>My businesses</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Business portal">
                    <Link href="/business">
                      <ArrowLeftRight className="size-4" />
                      <span>Business portal</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <UserMenu user={user} variant={variant} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

function BusinessSwitcher({ user }: { user: PortalUser }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const switchable = user.memberships.filter((m) => m.status === "active")

  if (!user.activeBusinessId) return null

  const switchTo = (businessId: string) => {
    startTransition(async () => {
      await fetch("/api/auth/switch-business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId }),
      })
      router.push("/business")
      router.refresh()
    })
  }

  const single = switchable.length <= 1 && !user.viewingAsAdmin

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild disabled={single}>
            <SidebarMenuButton
              size="lg"
              tooltip={user.activeBusinessName ?? "Business"}
              className={cn("border border-sidebar-border bg-sidebar-accent/40", pending && "opacity-60")}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground text-xs font-semibold uppercase">
                {initials(user.activeBusinessName ?? "B")}
              </span>
              <span className="grid flex-1 text-left leading-tight">
                <span className="truncate text-sm font-medium">{user.activeBusinessName}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {user.viewingAsAdmin ? "Viewing as platform admin" : user.activeRole ? ROLE_LABEL[user.activeRole] : ""}
                </span>
              </span>
              {!single && <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuLabel>Switch business</DropdownMenuLabel>
            {switchable.map((m) => (
              <DropdownMenuItem key={m.businessId} onSelect={() => switchTo(m.businessId)} className="gap-2">
                <span className="flex-1 truncate">{m.businessName}</span>
                <BusinessStatusBadge status={m.businessStatus} compact />
                {m.businessId === user.activeBusinessId && !user.viewingAsAdmin && <Check className="size-4" />}
              </DropdownMenuItem>
            ))}
            {user.isPlatformAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/admin/businesses" className="gap-2">
                    <Plus className="size-4" />
                    Browse all businesses
                  </Link>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

function UserMenu({ user, variant }: { user: PortalUser; variant: "admin" | "business" }) {
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  const signOut = async () => {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    await fetch("/api/auth/switch-business", { method: "DELETE" }).catch(() => undefined)
    router.replace("/login")
    router.refresh()
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" tooltip={user.email ?? "Account"}>
              <Avatar className="size-8 rounded-md">
                <AvatarFallback className="rounded-md bg-secondary text-secondary-foreground text-xs font-semibold uppercase">
                  {initials(user.email ?? "?")}
                </AvatarFallback>
              </Avatar>
              <span className="grid flex-1 text-left leading-tight">
                <span className="truncate text-sm font-medium">{user.email}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {user.isPlatformAdmin ? "Platform administrator" : user.activeRole ? ROLE_LABEL[user.activeRole] : "Member"}
                </span>
              </span>
              <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-60">
            <DropdownMenuLabel className="font-normal">
              <span className="block truncate text-sm font-medium">{user.email}</span>
              <span className="block text-xs text-muted-foreground">
                {variant === "admin" ? "Platform console" : user.activeBusinessName}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/reset-password">Change password</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={signOut} disabled={signingOut} className="gap-2">
              <LogOut className="size-4" />
              {signingOut ? "Signing out…" : "Sign out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

function initials(value: string) {
  const parts = value.replace(/@.*$/, "").split(/[\s._-]+/).filter(Boolean)
  return parts
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
}
