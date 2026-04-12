import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Building2, ShoppingBag, TrendingUp, Plus } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function AdminDashboardPage() {
  const supabase = createSupabaseServerClient()

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [
    { count: activeBusinesses },
    { count: ordersToday },
    { count: ordersWeek },
    { count: newBusinesses },
    { data: businesses },
  ] = await Promise.all([
    supabase.from("businesses").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("orders").select("*", { count: "exact", head: true }).gte("placed_at", todayStart),
    supabase.from("orders").select("*", { count: "exact", head: true }).gte("placed_at", weekStart),
    supabase.from("businesses").select("*", { count: "exact", head: true }).gte("created_at", monthStart),
    supabase.from("businesses").select("id, name, slug, is_active, created_at, phone_number").order("created_at", { ascending: false }).limit(10),
  ])

  const stats = [
    { label: "Active Businesses", value: activeBusinesses ?? 0, icon: Building2 },
    { label: "Orders Today", value: ordersToday ?? 0, icon: ShoppingBag },
    { label: "Orders This Week", value: ordersWeek ?? 0, icon: TrendingUp },
    { label: "New This Month", value: newBusinesses ?? 0, icon: Plus },
  ]

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Platform overview</p>
        </div>
        <Link href="/admin/businesses/new">
          <Button className="bg-[oklch(0.55_0.2_25)] hover:bg-[oklch(0.5_0.2_25)]">
            <Plus className="h-4 w-4 mr-2" />
            Onboard Business
          </Button>
        </Link>
      </div>

      {/* Stat cards */}
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
                <p className="text-3xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Businesses table */}
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">All Businesses</CardTitle>
          <Link href="/admin/businesses">
            <Button variant="ghost" size="sm">View all</Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Business</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Phone</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Joined</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(businesses ?? []).map((b) => (
                  <tr key={b.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{b.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{b.phone_number ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={b.is_active ? "default" : "secondary"} className={b.is_active ? "bg-green-600" : ""}>
                        {b.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(b.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/businesses/${b.slug}`}>
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
                {(businesses ?? []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No businesses yet. <Link href="/admin/businesses/new" className="underline">Onboard your first business</Link>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
