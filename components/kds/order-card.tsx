"use client"

import { useEffect, useState } from "react"
import { Clock, Phone, MessageSquare, Mic, X, Check, ChefHat } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export interface OrderItem {
  name: string
  qty: number
  bread?: string | null
  mods?: Array<{ type: "add" | "remove" | "note"; item: string }>
}

export interface Order {
  id: string
  order_number: number
  status: "pending" | "making" | "ready" | "done" | "cancelled"
  channel: "phone" | "whatsapp_text" | "whatsapp_voice" | "sms"
  customer_phone?: string
  placed_at: string
  items: OrderItem[]
  special_instructions?: string
}

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

  const timerClass = mins < 10 
    ? "text-[oklch(0.65_0.18_145)]" 
    : mins < 20 
    ? "text-[oklch(0.8_0.16_85)]" 
    : "text-[oklch(0.65_0.22_25)] animate-blink"

  return (
    <div className={cn("text-xl font-mono font-bold tabular-nums", timerClass)}>
      {mins}m
    </div>
  )
}

function ChannelBadge({ channel }: { channel: Order["channel"] }) {
  const config = {
    phone: { icon: Phone, label: "Phone", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    whatsapp_text: { icon: MessageSquare, label: "WhatsApp", className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
    whatsapp_voice: { icon: Mic, label: "Voice", className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
    sms: { icon: MessageSquare, label: "SMS", className: "bg-violet-500/20 text-violet-400 border-violet-500/30" },
  }[channel]

  const Icon = config.icon

  return (
    <Badge variant="outline" className={cn("gap-1.5 px-2.5 py-1 text-xs font-medium border", config.className)}>
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
  }[order.status] || ""

  const orderNumStyles = {
    pending: "text-[oklch(0.8_0.16_85)]",
    making: "text-[oklch(0.65_0.22_25)]",
    ready: "text-[oklch(0.65_0.18_145)]",
  }[order.status] || "text-foreground"

  return (
    <div
      className={cn(
        "rounded-xl border-2 p-5 transition-all duration-200 hover:-translate-y-0.5",
        "bg-card",
        statusStyles,
        flashing && "animate-flash"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className={cn("text-4xl font-black tracking-tight", orderNumStyles)}>
          #{order.order_number}
        </div>
        <div className="flex flex-col items-end gap-2">
          <ChannelBadge channel={order.channel} />
          <TimerDisplay placedAt={order.placed_at} />
          {order.customer_phone && (
            <span className="text-xs text-muted-foreground font-mono">
              {order.customer_phone}
            </span>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-border mb-4" />

      {/* Items */}
      <div className="space-y-3 mb-4">
        {order.items.map((item, i) => (
          <div key={i} className="flex gap-3">
            <div className="flex-shrink-0 h-7 w-7 rounded-md bg-[oklch(0.55_0.2_25)] text-white flex items-center justify-center text-sm font-bold">
              {item.qty}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-foreground leading-tight">
                {item.name}
              </div>
              {item.bread && (
                <div className="text-sm text-muted-foreground mt-0.5">
                  on {item.bread}
                </div>
              )}
              {item.mods && item.mods.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {item.mods.map((mod, j) => (
                    <Badge
                      key={j}
                      variant="outline"
                      className={cn(
                        "text-xs px-2 py-0.5 font-medium",
                        mod.type === "add" && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                        mod.type === "remove" && "bg-red-500/10 text-red-400 border-red-500/20",
                        mod.type === "note" && "bg-muted text-muted-foreground border-border"
                      )}
                    >
                      {mod.type === "add" ? "+" : mod.type === "remove" ? "−" : ""} {mod.item}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Special Instructions */}
      {order.special_instructions && (
        <div className="mb-4 p-3 rounded-lg bg-[oklch(0.25_0.04_85)]/50 border border-[oklch(0.8_0.16_85)]/30">
          <p className="text-sm text-[oklch(0.8_0.16_85)] font-medium">
            <span className="mr-1.5">⚑</span>
            {order.special_instructions}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {order.status === "pending" && (
          <>
            <Button
              onClick={() => onStatusChange(order.id, "making")}
              className="flex-1 bg-[oklch(0.55_0.2_25)] hover:bg-[oklch(0.5_0.2_25)] text-white font-semibold"
            >
              <ChefHat className="h-4 w-4 mr-2" />
              Accept
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onStatusChange(order.id, "cancelled")}
              className="text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        )}
        {order.status === "making" && (
          <Button
            onClick={() => onStatusChange(order.id, "ready")}
            className="flex-1 bg-[oklch(0.65_0.18_145)] hover:bg-[oklch(0.6_0.18_145)] text-white font-semibold"
          >
            <Check className="h-4 w-4 mr-2" />
            Done — Notify Customer
          </Button>
        )}
        {order.status === "ready" && (
          <Button
            onClick={() => onStatusChange(order.id, "done")}
            className="flex-1 bg-[oklch(0.65_0.18_145)] hover:bg-[oklch(0.6_0.18_145)] text-white font-semibold"
          >
            <Check className="h-4 w-4 mr-2" />
            Picked Up
          </Button>
        )}
      </div>
    </div>
  )
}
