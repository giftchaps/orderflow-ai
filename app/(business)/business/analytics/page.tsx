import { createSupabaseServerClient } from "@/lib/supabase/server"
import { requireBusinessContext } from "@/lib/auth/guards"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function AnalyticsPage() {
  const ctx = await requireBusinessContext("analytics.view")

  const supabase = createSupabaseServerClient()
  const monthStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: orders } = await supabase
    .from("orders")
    .select("placed_at, channel, items, status")
    .eq("business_id", ctx.businessId)
    .gte("placed_at", monthStart)
    .order("placed_at", { ascending: true })

  // Orders by channel
  const byChannel: Record<string, number> = {}
  const itemCounts: Record<string, number> = {}
  orders?.forEach((o) => {
    byChannel[o.channel] = (byChannel[o.channel] ?? 0) + 1
    const items = Array.isArray(o.items) ? o.items : []
    items.forEach((item: any) => {
      itemCounts[item.name] = (itemCounts[item.name] ?? 0) + (item.qty ?? 1)
    })
  })

  const topItems = Object.entries(itemCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)

  const channelLabels: Record<string, string> = { phone: "Phone", whatsapp_text: "WhatsApp", sms: "SMS", whatsapp_voice: "Voice" }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">Last 30 days</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Orders (30d)</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{orders?.length ?? 0}</p></CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Avg Orders/Day</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{((orders?.length ?? 0) / 30).toFixed(1)}</p></CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Most Popular Item</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-bold truncate">{topItems[0]?.[0] ?? "—"}</p></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders by channel */}
        <Card className="border-border">
          <CardHeader><CardTitle className="text-base">Orders by Channel</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(byChannel).map(([channel, count]) => {
              const total = orders?.length ?? 1
              const pct = Math.round((count / total) * 100)
              return (
                <div key={channel} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{channelLabels[channel] ?? channel}</span>
                    <span className="font-medium">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-[oklch(0.55_0.2_25)] rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
            {Object.keys(byChannel).length === 0 && (
              <p className="text-sm text-muted-foreground">No data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Top items */}
        <Card className="border-border">
          <CardHeader><CardTitle className="text-base">Top Items</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topItems.map(([name, count], i) => (
                <div key={name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <span className="w-5 text-muted-foreground font-mono">{i + 1}.</span>
                    <span className="font-medium">{name}</span>
                  </div>
                  <span className="text-muted-foreground">{count} orders</span>
                </div>
              ))}
              {topItems.length === 0 && <p className="text-sm text-muted-foreground">No data yet</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
