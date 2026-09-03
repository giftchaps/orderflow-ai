"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { Phone, LayoutDashboard, UtensilsCrossed, ClipboardList, BarChart3, Settings, Users, LogOut, MonitorCheck, Building2, MessageSquare, ShoppingBag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  external?: boolean
}

interface SidebarProps {
  variant: "admin" | "business"
  businessName?: string
  kitchenDisplayUrl?: string
}

const adminNav: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/businesses", label: "Businesses", icon: Building2 },
  { href: "/admin/orders", label: "All Orders", icon: ShoppingBag },
  { href: "/admin/demo-requests", label: "Demo Requests", icon: MessageSquare },
]

const businessNav: NavItem[] = [
  { href: "/business/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/business/menu", label: "Menu", icon: UtensilsCrossed },
  { href: "/business/orders", label: "Orders", icon: ClipboardList },
  { href: "/business/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/business/settings", label: "Settings", icon: Settings },
  { href: "/business/staff", label: "Staff", icon: Users },
]

export function Sidebar({ variant, businessName, kitchenDisplayUrl }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const nav = variant === "admin" ? adminNav : businessNav

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-card border-r border-border">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
        <div className="h-9 w-9 rounded-lg bg-[oklch(0.55_0.2_25)] flex items-center justify-center flex-shrink-0">
          <Phone className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold truncate">
            {variant === "admin" ? "OrderFlow AI" : (businessName ?? "OrderFlow AI")}
          </p>
          {variant === "admin" && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mt-0.5">Admin</Badge>
          )}
          {variant === "business" && (
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Portal</p>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-[oklch(0.55_0.2_25)] text-white"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </Link>
          )
        })}

        {/* Kitchen Display link for business users */}
        {variant === "business" && kitchenDisplayUrl && (
          <a
            href={kitchenDisplayUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <MonitorCheck className="h-4 w-4 flex-shrink-0" />
            Kitchen Display
          </a>
        )}
      </nav>

      {/* Sign out */}
      <div className="px-3 py-4 border-t border-border">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </aside>
  )
}
