"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Pause, Play, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { BusinessStatusBadge } from "@/components/portal/status-badge"
import { api } from "@/lib/api-client"
import { formatPriceCents, planFeatureSummary, type PlanTier } from "@/lib/business-shared"
import type { AdminBusiness } from "./tabs"

export function AccountPanel({
  business,
  planTiers,
  ordersThisMonth,
}: {
  business: AdminBusiness
  planTiers: PlanTier[]
  ordersThisMonth: number
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    plan: business.plan ?? "starter",
    slug: business.slug ?? "",
    owner_email: business.owner_email ?? "",
  })
  const [suspendOpen, setSuspendOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [statusBusy, setStatusBusy] = useState(false)

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const body: Record<string, unknown> = {}
      if (form.plan !== business.plan) body.plan = form.plan
      if (form.slug !== business.slug) body.slug = form.slug
      if (form.owner_email !== (business.owner_email ?? "")) body.owner_email = form.owner_email || null
      if (Object.keys(body).length === 0) return toast.info("No changes to save")
      await api(`/api/admin/businesses/${business.id}`, { method: "PATCH", body })
      toast.success("Account updated")
      if (body.slug) router.replace(`/admin/businesses/${body.slug}?tab=account`)
      else router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save")
    } finally {
      setSaving(false)
    }
  }

  const setStatus = async (status: "active" | "suspended" | "invited", r?: string) => {
    setStatusBusy(true)
    try {
      await api(`/api/admin/businesses/${business.id}/status`, { body: { status, reason: r } })
      toast.success(status === "active" ? "Business is live" : status === "suspended" ? "Business suspended" : "Status updated")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not change status")
    } finally {
      setStatusBusy(false)
      setSuspendOpen(false)
      setReason("")
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <Card className="p-5 shadow-none">
        <form onSubmit={save} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <p className="font-medium">Account</p>
            <p className="text-sm text-muted-foreground">Plan, URL slug and owner of record.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="plan">Plan</Label>
              <Select value={form.plan} onValueChange={(v) => setForm({ ...form, plan: v })}>
                <SelectTrigger id="plan" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {planTiers.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label} · {formatPriceCents(p.priceCents)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(() => {
                const tier = planTiers.find((p) => p.id === form.plan)
                if (!tier) return null
                return (
                  <p className="text-xs text-muted-foreground">
                    {planFeatureSummary(tier)}
                    {tier.monthlyOrderLimit && ` · ${ordersThisMonth}/${tier.monthlyOrderLimit} orders used this month`}
                    {" · "}
                    <Link href="/admin/plans" className="underline">
                      Edit price/limits
                    </Link>
                  </p>
                )
              })()}
              {business.subscription_status ? (
                <p className="text-xs text-muted-foreground">
                  Stripe: <span className="font-medium capitalize">{business.subscription_status.replace(/_/g, " ")}</span>
                  {business.current_period_end &&
                    ` · ${business.subscription_status === "canceled" ? "ended" : "renews"} ${new Date(business.current_period_end).toLocaleDateString()}`}
                  . Changing the plan here relabels it but does not change what Stripe charges — the business changes
                  that themselves from Settings, or you manage it from their Stripe customer record.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Not subscribed via Stripe yet — this label is manual.</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })}
                pattern="[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">Changing this changes the kitchen display URL.</p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="owner_email">Owner email</Label>
            <Input
              id="owner_email"
              type="email"
              value={form.owner_email}
              onChange={(e) => setForm({ ...form, owner_email: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Updating this re-points the pending owner invite, or promotes an existing team member with that email.
            </p>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              Save account
            </Button>
          </div>
        </form>
      </Card>

      <Card className="flex flex-col gap-4 p-5 shadow-none">
        <div className="flex items-center justify-between">
          <p className="font-medium">Lifecycle</p>
          <BusinessStatusBadge status={business.status} />
        </div>
        <p className="text-pretty text-sm text-muted-foreground">
          {business.status === "active" && "Live: the phone agent accepts orders and the kitchen display is on."}
          {business.status === "invited" && "Waiting for the owner to accept their invite. It goes live automatically when they do."}
          {business.status === "draft" && "Created without an invite. Send the owner invite from the Team tab, or activate manually."}
          {business.status === "suspended" && "Suspended: ingest returns 403, the display shows a paused screen, and staff cannot sign in to it."}
        </p>
        <div className="flex flex-col gap-2">
          {business.status !== "active" && (
            <Button onClick={() => setStatus("active")} disabled={statusBusy}>
              {statusBusy ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
              {business.status === "suspended" ? "Reactivate" : "Activate now"}
            </Button>
          )}
          {business.status === "draft" && (
            <Button variant="outline" onClick={() => setStatus("invited")} disabled={statusBusy}>
              <Send className="size-4" />
              Mark as invited
            </Button>
          )}
          {business.status !== "suspended" && (
            <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setSuspendOpen(true)} disabled={statusBusy}>
              <Pause className="size-4" />
              Suspend business
            </Button>
          )}
        </div>
      </Card>

      <AlertDialog open={suspendOpen} onOpenChange={setSuspendOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend {business.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Incoming orders will be rejected and the kitchen display paused until you reactivate. Staff keep their accounts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="suspend-reason">Reason (recorded in the audit log)</Label>
            <Textarea id="suspend-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Unpaid invoice" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => setStatus("suspended", reason || undefined)}>Suspend</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
