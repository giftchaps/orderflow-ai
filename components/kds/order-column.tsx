"use client"

import { Clock, ChefHat, Bell, Inbox } from "lucide-react"
import { cn } from "@/lib/utils"
import { OrderCard, Order } from "./order-card"

interface OrderColumnProps {
  title: string
  status: "pending" | "making" | "ready"
  orders: Order[]
  onStatusChange: (orderId: string, newStatus: Order["status"]) => void
  newOrderIds: Set<string>
}

const columnConfig = {
  pending: {
    icon: Clock,
    className: "bg-[oklch(0.25_0.04_85)] text-[oklch(0.8_0.16_85)] border-[oklch(0.8_0.16_85)]/30",
  },
  making: {
    icon: ChefHat,
    className: "bg-[oklch(0.25_0.05_25)] text-[oklch(0.65_0.22_25)] border-[oklch(0.65_0.22_25)]/30",
  },
  ready: {
    icon: Bell,
    className: "bg-[oklch(0.2_0.04_145)] text-[oklch(0.65_0.18_145)] border-[oklch(0.65_0.18_145)]/30",
  },
}

export function OrderColumn({ title, status, orders, onStatusChange, newOrderIds }: OrderColumnProps) {
  const config = columnConfig[status]
  const Icon = config.icon

  return (
    <div className="flex flex-col gap-4">
      <div
        className={cn(
          "flex items-center justify-center gap-2 py-3 px-4 rounded-lg border",
          "text-sm font-bold uppercase tracking-widest",
          config.className
        )}
      >
        <Icon className="h-4 w-4" />
        {title}
        <span className="ml-1 text-xs opacity-70">({orders.length})</span>
      </div>

      <div className="flex flex-col gap-4">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Inbox className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-xs uppercase tracking-widest font-medium">No orders</p>
          </div>
        ) : (
          orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onStatusChange={onStatusChange}
              isNew={newOrderIds.has(order.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}
