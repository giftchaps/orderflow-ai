"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ConfigDialog } from "@/components/kds/config-dialog"
import { Header, type ConnectionStatus } from "@/components/kds/header"
import { OrderColumn } from "@/components/kds/order-column"
import { OrderToast } from "@/components/kds/order-toast"
import { getDisplayToken, PinGate, usePinGate } from "@/components/kds/pin-gate"
import type { Order } from "@/lib/orders"

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
        bread: '12" Sub',
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
      { name: "Chicken Parm", qty: 2, bread: '6" Sub', mods: [] },
      {
        name: "Meatball Parmesan",
        qty: 1,
        bread: '12" Sub',
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

interface HealthResponse {
  ok: boolean
  status?: "connected" | "misconfigured" | "error"
  message?: string
  issues?: string[]
}

interface OrdersSuccessResponse {
  ok: true
  orders: Order[]
}

interface OrdersErrorResponse {
  ok: false
  message?: string
  issues?: string[]
}

function getChannelLabel(channel: Order["channel"]): string {
  const labels = {
    phone: "PHONE",
    whatsapp_text: "WHATSAPP",
    whatsapp_voice: "VOICE NOTE",
    sms: "SMS",
  } satisfies Record<Order["channel"], string>

  return labels[channel]
}

function playAlert() {
  try {
    const ctx = new AudioContext()

    const playDing = (startTime: number) => {
      const osc1 = ctx.createOscillator()
      const gain1 = ctx.createGain()
      osc1.type = "sine"
      osc1.frequency.value = 660
      gain1.gain.setValueAtTime(0, startTime)
      gain1.gain.linearRampToValueAtTime(0.6, startTime + 0.01)
      gain1.gain.exponentialRampToValueAtTime(0.001, startTime + 1.2)
      osc1.connect(gain1)
      gain1.connect(ctx.destination)
      osc1.start(startTime)
      osc1.stop(startTime + 1.2)

      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.type = "sine"
      osc2.frequency.value = 1320
      gain2.gain.setValueAtTime(0, startTime)
      gain2.gain.linearRampToValueAtTime(0.25, startTime + 0.01)
      gain2.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6)
      osc2.connect(gain2)
      gain2.connect(ctx.destination)
      osc2.start(startTime)
      osc2.stop(startTime + 0.6)
    }

    playDing(ctx.currentTime)
    playDing(ctx.currentTime + 0.65)
  } catch {
    // Audio context is not always available.
  }
}

function isOrdersErrorResponse(
  payload: OrdersSuccessResponse | OrdersErrorResponse
): payload is OrdersErrorResponse {
  return payload.ok === false
}

export function KitchenDisplay({ slug }: { slug?: string }) {
  const { unlocked, checking } = usePinGate(slug)
  const [pinUnlocked, setPinUnlocked] = useState(false)

  const [orders, setOrders] = useState<Order[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set())
  const [demoMode, setDemoMode] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected")
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const healthIssuesRef = useRef<string[]>([])
  const newOrderTimeoutRef = useRef<number | null>(null)

  const isUnlocked = unlocked || pinUnlocked

  const showToast = useCallback((message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 3000)
  }, [])

  const setNewOrders = useCallback((orderIds: string[]) => {
    if (newOrderTimeoutRef.current) {
      window.clearTimeout(newOrderTimeoutRef.current)
    }

    setNewOrderIds(new Set(orderIds))
    newOrderTimeoutRef.current = window.setTimeout(() => {
      setNewOrderIds(new Set())
      newOrderTimeoutRef.current = null
    }, 3000)
  }, [])

  const syncOrders = useCallback(async () => {
    try {
      const url = slug ? `/api/orders?slug=${encodeURIComponent(slug)}` : "/api/orders"
      const displayToken = slug ? getDisplayToken(slug) : null
      const response = await fetch(url, {
        cache: "no-store",
        headers: displayToken ? { "x-kds-token": displayToken } : undefined,
      })
      const payload = (await response.json()) as OrdersSuccessResponse | OrdersErrorResponse

      if (!response.ok) {
        const errorPayload = isOrdersErrorResponse(payload)
          ? payload
          : { ok: false as const, message: "Unable to load orders.", issues: [] }
        const message = errorPayload.issues?.length
          ? errorPayload.issues.join(" ")
          : errorPayload.message || "Unable to load orders."

        healthIssuesRef.current = errorPayload.issues ?? []
        setConnectionStatus("error")
        setConnectionError(message)
        setShowConfig(true)
        return
      }

      if (isOrdersErrorResponse(payload)) {
        const message = payload.issues?.length
          ? payload.issues.join(" ")
          : payload.message || "Unable to load orders."

        healthIssuesRef.current = payload.issues ?? []
        setConnectionStatus("error")
        setConnectionError(message)
        setShowConfig(true)
        return
      }

      setOrders((currentOrders) => {
        const currentIds = new Set(currentOrders.map((order) => order.id))
        const insertedOrders = payload.orders.filter((order) => !currentIds.has(order.id))

        if (insertedOrders.length > 0 && currentOrders.length > 0) {
          setNewOrders(insertedOrders.map((order) => order.id))
          playAlert()
          showToast(
            `New order #${insertedOrders[0].order_number} - ${getChannelLabel(insertedOrders[0].channel)}`
          )
        }

        if (payload.orders.length === 0) {
          setNewOrderIds(new Set())
        }

        return payload.orders
      })

      healthIssuesRef.current = []
      setConnectionStatus("connected")
      setConnectionError(null)
      setShowConfig(false)
    } catch (error) {
      setConnectionStatus("error")
      setConnectionError(error instanceof Error ? error.message : "Failed to connect")
      setShowConfig(true)
    } finally {
      setIsRefreshing(false)
    }
  }, [setNewOrders, showToast])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await syncOrders()
  }, [syncOrders])

  useEffect(() => {
    if (demoMode) {
      return
    }

    let cancelled = false

    const bootstrap = async () => {
      setConnectionStatus("connecting")
      setConnectionError(null)

      try {
        const healthUrl = slug ? `/api/health/db?slug=${encodeURIComponent(slug)}` : "/api/health/db"
        const response = await fetch(healthUrl, { cache: "no-store" })
        const payload = (await response.json()) as HealthResponse

        if (cancelled) {
          return
        }

        if (!response.ok || !payload.ok) {
          setConnectionStatus("error")
          setConnectionError(payload.message || "Database connection failed.")
          healthIssuesRef.current = payload.issues ?? []
          setShowConfig(true)
          return
        }

        await syncOrders()
      } catch (error) {
        if (cancelled) {
          return
        }
        setConnectionStatus("error")
        setConnectionError(
          error instanceof Error ? error.message : "Database connection failed."
        )
        setShowConfig(true)
      }
    }

    void bootstrap()

    const interval = window.setInterval(() => {
      void syncOrders()
    }, 15000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [demoMode, syncOrders])

  useEffect(() => {
    if (!demoMode) {
      return
    }

    setOrders(DEMO_ORDERS)
    setNewOrderIds(new Set())
    setConnectionStatus("connected")
    setConnectionError(null)
    setShowConfig(false)
  }, [demoMode])

  useEffect(() => {
    return () => {
      if (newOrderTimeoutRef.current) {
        window.clearTimeout(newOrderTimeoutRef.current)
      }
    }
  }, [])

  const handleStatusChange = async (orderId: string, newStatus: Order["status"]) => {
    if (demoMode) {
      setOrders((currentOrders) =>
        currentOrders
          .map((order) => (order.id === orderId ? { ...order, status: newStatus } : order))
          .filter((order) => !["done", "cancelled"].includes(order.status))
      )

      if (newStatus === "ready") {
        showToast("Customer notified - order is ready!")
      }

      return
    }

    try {
      const patchUrl = slug
        ? `/api/orders/${orderId}?slug=${encodeURIComponent(slug)}`
        : `/api/orders/${orderId}`
      const displayToken = slug ? getDisplayToken(slug) : null
      const response = await fetch(patchUrl, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(displayToken ? { "x-kds-token": displayToken } : {}),
        },
        body: JSON.stringify({ status: newStatus }),
      })

      const payload = (await response.json()) as { ok: boolean; message?: string }

      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || "Unable to update order.")
      }

      await syncOrders()

      if (newStatus === "ready") {
        showToast("Customer notified - order is ready!")
      }
    } catch (error) {
      setConnectionStatus("error")
      setConnectionError(error instanceof Error ? error.message : "Unable to update order.")
    }
  }

  if (checking) {
    return <div className="min-h-screen bg-background" />
  }

  if (!isUnlocked && slug) {
    return <PinGate slug={slug} onUnlock={() => setPinUnlocked(true)} />
  }

  const pendingOrders = orders.filter((order) => order.status === "pending")
  const makingOrders = orders.filter((order) => order.status === "making")
  const readyOrders = orders.filter((order) => order.status === "ready")

  return (
    <div className="min-h-screen bg-background">
      {showConfig && <ConfigDialog onDemo={() => setDemoMode(true)} issues={healthIssuesRef.current} />}

      <Header
        orderCount={orders.length}
        connectionStatus={connectionStatus}
        connectionError={connectionError}
        onRefresh={!showConfig || demoMode ? handleRefresh : undefined}
        isRefreshing={isRefreshing}
        slug={slug}
      />

      <main className="p-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
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

export default function KitchenDisplayPage() {
  return <KitchenDisplay />
}
