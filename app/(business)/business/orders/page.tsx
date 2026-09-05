import { requireBusinessContext } from "@/lib/auth/guards"
import { listOrders } from "@/lib/orders-server"
import { OrderHistoryTable } from "@/components/business/order-history-table"

export default async function OrdersPage() {
  const ctx = await requireBusinessContext("orders.view")
  const orders = await listOrders(ctx.businessId, { limit: 200 })

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Order History</h1>
        <p className="text-muted-foreground text-sm mt-1">{orders.length} orders total</p>
      </div>

      <OrderHistoryTable initialOrders={orders} canDelete={ctx.can("orders.delete")} />
    </div>
  )
}
