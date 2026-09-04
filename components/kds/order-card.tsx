"use client"

import { useEffect, useState } from "react"
import { Check, ChefHat, Globe, MessageSquare, Mic, Phone, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Order } from "@/lib/orders"

interface OrderCardProps {
  order: Order
  onStatusChange: (orderId: string, newStatus: Order["status"]) => void
  isNew?: boolean
}

function getElapsedMins(placedAt: string): number {
  return Math.floor((Date.now() - new Date(placedAt).getTime()) / 60000)
}

function TimerDisplay({ placedAt }: { placedAt: string }) {
  const [mins, setMins] = useState(getElapsedMins(placedAt))

  useEffect(() => {
    const interval = setInterval(() => setMins(getElapsedMins(placedAt)), 10000)
    return () => clearInterval(interval)
  }, [placedAt])

  const timerClass =
    mins < 10
      ? "text-[oklch(0.65_0.18_145)]"
      : mins < 20
        ? "text-[oklch(0.8_0.16_85)]"
        : "animate-blink text-[oklch(0.65_0.22_25)]"

  return <div className={cn("text-xl font-mono font-bold tabular-nums", timerClass)}>{mins}m</div>
}

function ChannelBadge({ channel }: { channel: Order["channel"] }) {
  const configMap = {
    phone: {
      icon: Phone,
      label: "Phone",
      className: "border-blue-500/30 bg-blue-500/20 text-blue-400",
    },
    whatsapp_text: {
      icon: MessageSquare,
      label: "WhatsApp",
      className: "border-emerald-500/30 bg-emerald-500/20 text-emerald-400",
    },
    whatsapp_voice: {
      icon: Mic,
      label: "Voice",
      className: "border-emerald-500/30 bg-emerald-500/20 text-emerald-400",
    },
    sms: {
      icon: MessageSquare,
      label: "SMS",
      className: "border-violet-500/30 bg-violet-500/20 text-violet-400",
    },
    web: {
      icon: Globe,
      label: "Web",
      className: "border-amber-500/30 bg-amber-500/20 text-amber-400",
    },
  } satisfies Record<Order["channel"], { icon: typeof Phone; label: string; className: string }>

  const config = configMap[channel]

  const Icon = config.icon

  return (
    <Badge variant="outline" className={cn("gap-1.5 border px-2.5 py-1 text-xs font-medium", config.className)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
}

export function OrderCard({ order, onStatusChange, isNew = false }: OrderCardProps) {
  const [flashing, setFlashing] = useState(isNew)

  useEffect(() => {
    if (isNew) {
      const timeout = setTimeout(() => setFlashing(false), 2200)
      return () => clearTimeout(timeout)
    }
  }, [isNew])

  const statusStyles = {
    pending: "border-[oklch(0.8_0.16_85)]/50 bg-[oklch(0.25_0.04_85)]/30",
    making: "border-[oklch(0.65_0.22_25)]/50 bg-[oklch(0.25_0.05_25)]/30",
    ready: "border-[oklch(0.65_0.18_145)]/60 bg-[oklch(0.2_0.04_145)]/40",
    done: "",
    cancelled: "",
  }[order.status] || ""

  const orderNumStyles = {
    pending: "text-[oklch(0.8_0.16_85)]",
    making: "text-[oklch(0.65_0.22_25)]",
    ready: "text-[oklch(0.65_0.18_145)]",
    done: "text-foreground",
    cancelled: "text-foreground",
  }[order.status] || "text-foreground"

  return (
    <div
      className={cn(
        "rounded-xl border-2 bg-card p-5 transition-all duration-200 hover:-translate-y-0.5",
        statusStyles,
        flashing && "animate-flash"
      )}
    >
      <div className="mb-4 flex items-start justify-between">
        <div className={cn("text-4xl font-black tracking-tight", orderNumStyles)}>#{order.order_number}</div>
        <div className="flex flex-col items-end gap-2">
          <ChannelBadge channel={order.channel} />
          <TimerDisplay placedAt={order.placed_at} />
          {order.customer_phone && (
            <span className="font-mono text-xs text-muted-foreground">{order.customer_phone}</span>
          )}
        </div>
      </div>

      <div className="mb-4 h-px bg-border" />

      <div className="mb-4 space-y-3">
        {order.items.map((item, index) => (
          <div key={`${order.id}-${item.name}-${index}`} className="flex gap-3">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-[oklch(0.55_0.2_25)] text-sm font-bold text-white">
              {item.qty}
            </div>
            <div className="min-w-0 flex-1">
              <div className="leading-tight text-foreground font-semibold">{item.name}</div>
              {item.bread && <div className="mt-0.5 text-sm text-muted-foreground">on {item.bread}</div>}
              {item.mods && item.mods.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {item.mods.map((mod, modIndex) => (
                    <Badge
                      key={`${order.id}-${item.name}-${mod.item}-${modIndex}`}
                      variant="outline"
                      className={cn(
                        "px-2 py-0.5 text-xs font-medium",
                        mod.type === "add" && "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
                        mod.type === "remove" && "border-red-500/20 bg-red-500/10 text-red-400",
                        mod.type === "note" && "border-border bg-muted text-muted-foreground"
                      )}
                    >
                      {mod.type === "add" ? "+" : mod.type === "remove" ? "-" : ""} {mod.item}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {order.special_instructions && (
        <div className="mb-4 rounded-lg border border-[oklch(0.8_0.16_85)]/30 bg-[oklch(0.25_0.04_85)]/50 p-3">
          <p className="text-sm font-medium text-[oklch(0.8_0.16_85)]">
            <span className="mr-1.5">!</span>
            {order.special_instructions}
          </p>
        </div>
      )}

      <div className="flex gap-2">
        {order.status === "pending" && (
          <>
            <Button
              onClick={() => onStatusChange(order.id, "making")}
              className="flex-1 bg-[oklch(0.55_0.2_25)] font-semibold text-white hover:bg-[oklch(0.5_0.2_25)]"
            >
              <ChefHat className="mr-2 h-4 w-4" />
              Accept
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onStatusChange(order.id, "cancelled")}
              className="text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        )}
        {order.status === "making" && (
          <Button
            onClick={() => onStatusChange(order.id, "ready")}
            className="flex-1 bg-[oklch(0.65_0.18_145)] font-semibold text-white hover:bg-[oklch(0.6_0.18_145)]"
          >
            <Check className="mr-2 h-4 w-4" />
            Done - Notify Customer
          </Button>
        )}
        {order.status === "ready" && (
          <Button
            onClick={() => onStatusChange(order.id, "done")}
            className="flex-1 bg-[oklch(0.65_0.18_145)] font-semibold text-white hover:bg-[oklch(0.6_0.18_145)]"
          >
            <Check className="mr-2 h-4 w-4" />
            Picked Up
          </Button>
        )}
      </div>
    </div>
  )
}
