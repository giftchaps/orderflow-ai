"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { createClient, SupabaseClient } from "@supabase/supabase-js"
import { Header } from "@/components/kds/header"
import { OrderColumn } from "@/components/kds/order-column"
import { ConfigDialog } from "@/components/kds/config-dialog"
import { OrderToast } from "@/components/kds/order-toast"
import { Order } from "@/components/kds/order-card"

// Demo data for testing without Supabase
const DEMO_ORDERS: Order[] = [
  {
    id: "demo-1",
    order_number: 47,
    status: "pending",
    channel: "phone",
    customer_phone: "+1 203 555 0199",
    placed_at: new Date(Date.now() - 3 * 60000).toISOString(),
    items: [
      {
        name: "Michelangelo",
        qty: 1,
        bread: "12\" Sub",
        mods: [
          { type: "remove", item: "no cherry peppers" },
          { type: "add", item: "extra provolone" },
        ],
      },
      { name: "Provy", qty: 1, bread: "Hard Roll", mods: [] },
    ],
    special_instructions: "",
  },
  {
    id: "demo-2",
    order_number: 48,
    status: "making",
    channel: "phone",
    customer_phone: "+1 203 555 0211",
    placed_at: new Date(Date.now() - 8 * 60000).toISOString(),
    items: [
      { name: "Chicken Parm", qty: 2, bread: "6\" Sub", mods: [] },
      {
        name: "Meatball Parmesan",
        qty: 1,
        bread: "12\" Sub",
        mods: [{ type: "add", item: "extra sauce" }],
      },
    ],
    special_instructions: "Extra napkins please",
  },
  {
    id: "demo-3",
    order_number: 46,
    status: "ready",
    channel: "whatsapp_text",
    customer_phone: "+1 203 555 0133",
    placed_at: new Date(Date.now() - 22 * 60000).toISOString(),
    items: [
      {
        name: "Caesar Salad",
        qty: 1,
        bread: null,
        mods: [{ type: "add", item: "extra chicken" }],
      },
    ],
    special_instructions: "",
  },
]

// Channel label helper
function getChannelLabel(channel: Order["channel"]): string {
  const labels = {
    phone: "PHONE",
    whatsapp_text: "WHATSAPP",
    whatsapp_voice: "VOICE NOTE",
    sms: "SMS",
  }
  return labels[channel]
}

// Audio alert
function playAlert() {
  try {
    const ctx = new AudioContext()
    ;[0, 150, 300].forEach((delay) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.4, ctx.currentTime + delay / 1000)
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + delay / 1000 + 0.3
      )
      osc.start(ctx.currentTime + delay / 1000)
      osc.stop(ctx.currentTime + delay / 1000 + 0.3)
    })
  } catch {
    // Audio context not available
  }
}

interface Config {
  url: string
  key: string
  businessId: string
}

export default function KitchenDisplay() {
  const [orders, setOrders] = useState<Order[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set())
  const [config, setConfig] = useState<Config | null>(null)
  const [demoMode, setDemoMode] = useState(false)
  const [showConfig, setShowConfig] = useState(true)
  const supabaseRef = useRef<SupabaseClient | null>(null)

  // Check for saved config on mount
  useEffect(() => {
    const url = localStorage.getItem("kds_url")
    const key = localStorage.getItem("kds_key")
    const businessId = localStorage.getItem("kds_biz")
    if (url && key && businessId) {
      setConfig({ url, key, businessId })
      setShowConfig(false)
    }
  }, [])

  // Show toast helper
  const showToast = useCallback((message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }, [])

  // Connect to Supabase
  useEffect(() => {
    if (!config) return

    const supabase = createClient(config.url, config.key)
    supabaseRef.current = supabase

    // Initial fetch
    const fetchOrders = async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("business_id", config.businessId)
        .in("status", ["pending", "making", "ready"])
        .order("placed_at", { ascending: true })

      if (data) {
        setOrders(data as Order[])
      }
    }
    fetchOrders()

    // Real-time subscription
    const channel = supabase
      .channel("orders-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `business_id=eq.${config.businessId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newOrder = payload.new as Order
            setOrders((prev) => [...prev, newOrder])
            setNewOrderIds((prev) => new Set([...prev, newOrder.id]))
            playAlert()
            showToast(
              `New order #${newOrder.order_number} — ${getChannelLabel(newOrder.channel)}`
            )
            setTimeout(() => {
              setNewOrderIds((prev) => {
                const next = new Set(prev)
                next.delete(newOrder.id)
                return next
              })
            }, 3000)
          }
          if (payload.eventType === "UPDATE") {
            setOrders((prev) =>
              prev
                .map((o) => (o.id === payload.new.id ? (payload.new as Order) : o))
                .filter((o) => !["done", "cancelled"].includes(o.status))
            )
          }
          if (payload.eventType === "DELETE") {
            setOrders((prev) =>
              prev.filter((o) => o.id !== (payload.old as Order).id)
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [config, showToast])

  // Demo mode
  useEffect(() => {
    if (demoMode) {
      setOrders(DEMO_ORDERS)
      setShowConfig(false)
    }
  }, [demoMode])

  // Handle status changes
  const handleStatusChange = async (
    orderId: string,
    newStatus: Order["status"]
  ) => {
    if (demoMode) {
      setOrders((prev) =>
        prev
          .map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
          .filter((o) => !["done", "cancelled"].includes(o.status))
      )
      if (newStatus === "ready") {
        showToast("Customer notified — order is ready!")
      }
      return
    }

    if (!supabaseRef.current) return

    const now = new Date().toISOString()
    const updates: Record<string, string> = { status: newStatus }
    if (newStatus === "making") updates.accepted_at = now
    if (newStatus === "ready") updates.ready_at = now
    if (newStatus === "done") updates.completed_at = now

    await supabaseRef.current.from("orders").update(updates).eq("id", orderId)

    if (newStatus === "ready") {
      showToast("Customer notified — order is ready!")
    }
  }

  // Handle config connection
  const handleConnect = (url: string, key: string, businessId: string) => {
    localStorage.setItem("kds_url", url)
    localStorage.setItem("kds_key", key)
    localStorage.setItem("kds_biz", businessId)
    setConfig({ url, key, businessId })
    setShowConfig(false)
  }

  // Filter orders by status
  const pendingOrders = orders.filter((o) => o.status === "pending")
  const makingOrders = orders.filter((o) => o.status === "making")
  const readyOrders = orders.filter((o) => o.status === "ready")

  return (
    <div className="min-h-screen bg-background">
      {showConfig && (
        <ConfigDialog
          onConnect={handleConnect}
          onDemo={() => setDemoMode(true)}
        />
      )}

      <Header orderCount={orders.length} />

      <main className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <OrderColumn
            title="New"
            status="pending"
            orders={pendingOrders}
            onStatusChange={handleStatusChange}
            newOrderIds={newOrderIds}
          />
          <OrderColumn
            title="Making"
            status="making"
            orders={makingOrders}
            onStatusChange={handleStatusChange}
            newOrderIds={newOrderIds}
          />
          <OrderColumn
            title="Ready"
            status="ready"
            orders={readyOrders}
            onStatusChange={handleStatusChange}
            newOrderIds={newOrderIds}
          />
        </div>
      </main>

      {toast && <OrderToast message={toast} />}
    </div>
  )
}
