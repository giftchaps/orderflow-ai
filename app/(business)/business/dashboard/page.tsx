import { createSupabaseServerClient } from "@/lib/supabase/server"
import { requireBusinessContext } from "@/lib/auth/guards"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShoppingBag, TrendingUp, Clock, Radio, ExternalLink } from "lucide-react"
import Link from "next/link"

export default async function BusinessDashboardPage() {
  const ctx = await requireBusinessContext()
  const businessId = ctx.businessId

  const supabase = createSupabaseServerClient()
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString()

  const [
    { data: business },
    { count: ordersToday },
    { count: ordersWeek },
    { data: recentOrders },
  ] = await Promise.all([
    supabase.from("businesses").select("name, slug, phone_number, vapi_assistant_id").eq("id", businessId).single(),
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("business_id", businessId).gte("placed_at", todayStart),
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("business_id", businessId).gte("placed_at", weekStart),
    supabase.from("orders").select("id, order_number, status, channel, placed_at, items").eq("business_id", businessId).order("placed_at", { ascending: false }).limit(5),
  ])

  const isLive = !!(business?.phone_number || business?.vapi_assistant_id)
  const kitchenUrl = business?.slug ? `/display/${business.slug}` : null

  const stats = [
    { label: "Orders Today", value: ordersToday ?? 0, icon: ShoppingBag },
    { label: "Orders This Week", value: ordersWeek ?? 0, icon: TrendingUp },
    { label: "Prep Time", value: "~15 min", icon: Clock },
    { label: "Agent Status", value: isLive ? "Live" : "Offline", icon: Radio, live: isLive },
  ]

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-600",
    making: "bg-blue-500/20 text-blue-600",
    ready: "bg-green-500/20 text-green-600",
    done: "bg-secondary text-muted-foreground",
    cancelled: "bg-red-500/20 text-red-600",
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{business?.name ?? "Dashboard"}</h1>
          <p className="text-muted-foreground text-sm mt-1">Welcome back</p>
        </div>
        <div className="flex items-center gap-3">
          {kitchenUrl && (
            <a href={kitchenUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                Kitchen Display
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {"live" in stat ? (
                  <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full ${stat.live ? "bg-green-500 animate-pulse" : "bg-muted-foreground"}`} />
                    <span className="text-lg font-bold">{stat.value}</span>
                  </div>
                ) : (
                  <p className="text-3xl font-bold">{stat.value}</p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Recent Orders */}
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Orders</CardTitle>
          <Link href="/business/orders">
            <Button variant="ghost" size="sm">View all</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {(recentOrders ?? []).length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">No orders yet. Your AI agent is ready to take calls!</p>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">#</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Items</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Time</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(recentOrders ?? []).map((order) => {
                    const items = Array.isArray(order.items) ? order.items : []
                    const summary = items.map((i: any) => `${i.qty > 1 ? `${i.qty}x ` : ""}${i.name}`).join(", ")
                    return (
                      <tr key={order.id} className="hover:bg-secondary/30">
                        <td className="px-4 py-3 font-bold">#{order.order_number}</td>
                        <td className="px-4 py-3 text-muted-foreground truncate max-w-xs">{summary || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(order.placed_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${statusColors[order.status] ?? ""}`}>
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
