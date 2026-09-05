"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { ArrowDown, ArrowUp, ArrowUpDown, Download, Loader2, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { api } from "@/lib/api-client"
import { CHANNEL_LABEL, ORDER_STATUSES, STATUS_LABEL, summarizeItems, type Order } from "@/lib/orders"

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30",
  making: "bg-blue-500/20 text-blue-600 border-blue-500/30",
  ready: "bg-green-500/20 text-green-600 border-green-500/30",
  done: "bg-secondary text-muted-foreground",
  cancelled: "bg-red-500/20 text-red-600 border-red-500/30",
}

type SortKey = "order_number" | "placed_at" | "channel" | "customer_phone" | "status"
type SortDir = "asc" | "desc"

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function downloadCsv(rows: Order[]) {
  const header = ["Order #", "Placed at", "Channel", "Items", "Customer", "Status"]
  const lines = rows.map((o) =>
    [
      String(o.order_number),
      new Date(o.placed_at).toLocaleString(),
      CHANNEL_LABEL[o.channel] ?? o.channel,
      summarizeItems(o.items, 99),
      o.customer_phone ?? "",
      STATUS_LABEL[o.status] ?? o.status,
    ]
      .map((v) => csvEscape(String(v)))
      .join(",")
  )
  const csv = [header.join(","), ...lines].join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function OrderHistoryTable({ initialOrders, canDelete }: { initialOrders: Order[]; canDelete: boolean }) {
  const [orders, setOrders] = useState(initialOrders)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sortKey, setSortKey] = useState<SortKey>("placed_at")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null)
  const [deleting, setDeleting] = useState(false)

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir(key === "placed_at" || key === "order_number" ? "desc" : "asc")
    }
  }

  const filtered = useMemo(
    () => (statusFilter === "all" ? orders : orders.filter((o) => o.status === statusFilter)),
    [orders, statusFilter]
  )

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "order_number":
          return (a.order_number - b.order_number) * dir
        case "placed_at":
          return (new Date(a.placed_at).getTime() - new Date(b.placed_at).getTime()) * dir
        case "channel":
          return a.channel.localeCompare(b.channel) * dir
        case "customer_phone":
          return (a.customer_phone ?? "").localeCompare(b.customer_phone ?? "") * dir
        case "status":
          return a.status.localeCompare(b.status) * dir
        default:
          return 0
      }
    })
  }, [filtered, sortKey, sortDir])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api(`/api/orders/${deleteTarget.id}`, { method: "DELETE" })
      setOrders((prev) => prev.filter((o) => o.id !== deleteTarget.id))
      toast.success(`Order #${deleteTarget.order_number} deleted`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete order")
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  const SortHeader = ({ label, sortableKey }: { label: string; sortableKey: SortKey }) => (
    <th className="text-left px-6 py-4 font-medium text-muted-foreground">
      <button
        type="button"
        onClick={() => toggleSort(sortableKey)}
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        {label}
        {sortKey === sortableKey ? (
          sortDir === "asc" ? (
            <ArrowUp className="size-3.5" />
          ) : (
            <ArrowDown className="size-3.5" />
          )
        ) : (
          <ArrowUpDown className="size-3.5 opacity-40" />
        )}
      </button>
    </th>
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {ORDER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={() => downloadCsv(sorted)} disabled={sorted.length === 0}>
          <Download className="mr-2 size-4" />
          Export CSV ({sorted.length})
        </Button>
      </div>

      <Card className="border-border">
        <CardContent className="p-0">
          <div className="rounded-lg overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 border-b border-border">
                <tr>
                  <SortHeader label="#" sortableKey="order_number" />
                  <SortHeader label="Time" sortableKey="placed_at" />
                  <SortHeader label="Channel" sortableKey="channel" />
                  <th className="text-left px-6 py-4 font-medium text-muted-foreground">Items</th>
                  <SortHeader label="Customer" sortableKey="customer_phone" />
                  <SortHeader label="Status" sortableKey="status" />
                  {canDelete && <th className="px-6 py-4" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sorted.map((order) => (
                  <tr key={order.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-4 font-bold">#{order.order_number}</td>
                    <td className="px-6 py-4 text-muted-foreground">
                      <div>{new Date(order.placed_at).toLocaleDateString()}</div>
                      <div className="text-xs">
                        {new Date(order.placed_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="text-xs">
                        {CHANNEL_LABEL[order.channel] ?? order.channel}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground max-w-xs">
                      <span className="truncate block">{summarizeItems(order.items)}</span>
                      {order.special_instructions && (
                        <span className="text-xs text-yellow-600 block mt-0.5">Note: {order.special_instructions}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{order.customer_phone ?? "—"}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium capitalize border ${STATUS_COLORS[order.status] ?? ""}`}
                      >
                        {STATUS_LABEL[order.status] ?? order.status}
                      </span>
                    </td>
                    {canDelete && (
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteTarget(order)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={canDelete ? 7 : 6} className="px-6 py-12 text-center text-muted-foreground">
                      No orders match this filter
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete order #{deleteTarget?.order_number}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the order and its history. This can't be undone — export a CSV first if you want a
              record of it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive hover:bg-destructive/90">
              {deleting && <Loader2 className="mr-2 size-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
