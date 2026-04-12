import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { redirect } from "next/navigation"

export default async function OrdersPage() {
  const role = await getUserRole()
  if (!role?.business_id) redirect("/login")

  const supabase = createSupabaseServerClient()

  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_number, status, channel, customer_phone, placed_at, items, special_instructions, raw_transcript")
    .eq("business_id", role.business_id)
    .order("placed_at", { ascending: false })
    .limit(100)

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30",
    making: "bg-blue-500/20 text-blue-600 border-blue-500/30",
    ready: "bg-green-500/20 text-green-600 border-green-500/30",
    done: "bg-secondary text-muted-foreground",
    cancelled: "bg-red-500/20 text-red-600 border-red-500/30",
  }

  const channelLabels: Record<string, string> = {
    phone: "Phone",
    whatsapp_text: "WhatsApp",
    whatsapp_voice: "Voice Note",
    sms: "SMS",
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Order History</h1>
        <p className="text-muted-foreground text-sm mt-1">{orders?.length ?? 0} orders total</p>
      </div>

      <Card className="border-border">
        <CardContent className="p-0">
          <div className="rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 border-b border-border">
                <tr>
                  <th className="text-left px-6 py-4 font-medium text-muted-foreground">#</th>
                  <th className="text-left px-6 py-4 font-medium text-muted-foreground">Time</th>
                  <th className="text-left px-6 py-4 font-medium text-muted-foreground">Channel</th>
                  <th className="text-left px-6 py-4 font-medium text-muted-foreground">Items</th>
                  <th className="text-left px-6 py-4 font-medium text-muted-foreground">Customer</th>
                  <th className="text-left px-6 py-4 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(orders ?? []).map((order) => {
                  const items = Array.isArray(order.items) ? order.items : []
                  const summary = items.map((i: any) => `${i.qty > 1 ? `${i.qty}x ` : ""}${i.name}`).join(", ")
                  return (
                    <tr key={order.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-6 py-4 font-bold">#{order.order_number}</td>
                      <td className="px-6 py-4 text-muted-foreground">
                        <div>{new Date(order.placed_at).toLocaleDateString()}</div>
                        <div className="text-xs">{new Date(order.placed_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="text-xs">{channelLabels[order.channel] ?? order.channel}</Badge>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground max-w-xs">
                        <span className="truncate block">{summary || "—"}</span>
                        {order.special_instructions && (
                          <span className="text-xs text-yellow-600 block mt-0.5">Note: {order.special_instructions}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{order.customer_phone ?? "—"}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize border ${statusColors[order.status] ?? ""}`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
                {(orders ?? []).length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">No orders yet</td>
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
