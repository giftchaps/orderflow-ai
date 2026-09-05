"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { CheckCircle2, ExternalLink, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api-client"
import { PLANS, type PlanId } from "@/lib/business-shared"

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  trialing: "Trial",
  past_due: "Payment failed",
  canceled: "Canceled",
  unpaid: "Unpaid",
  incomplete: "Incomplete",
  incomplete_expired: "Expired",
  paused: "Paused",
}

const STATUS_TONE: Record<string, string> = {
  active: "bg-status-ready-bg text-success",
  trialing: "bg-status-ready-bg text-success",
  past_due: "bg-status-pending-bg text-warning-foreground",
  canceled: "bg-status-making-bg text-destructive",
  unpaid: "bg-status-making-bg text-destructive",
  incomplete: "bg-secondary text-muted-foreground",
  incomplete_expired: "bg-secondary text-muted-foreground",
  paused: "bg-secondary text-muted-foreground",
}

export function BillingPanel({
  plan,
  subscriptionStatus,
  currentPeriodEnd,
  canManage,
}: {
  plan: string | null
  subscriptionStatus: string | null
  currentPeriodEnd: string | null
  canManage: boolean
}) {
  const params = useSearchParams()
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null)
  const [openingPortal, setOpeningPortal] = useState(false)

  useEffect(() => {
    const billing = params.get("billing")
    if (billing === "success") toast.success("Subscription active — thanks!")
    if (billing === "cancelled") toast.info("Checkout cancelled — no changes made.")
  }, [params])

  const subscribed = Boolean(subscriptionStatus)

  const subscribe = async (planId: PlanId) => {
    setLoadingPlan(planId)
    try {
      const { url } = await api<{ url: string }>("/api/business/billing/checkout", { body: { plan: planId } })
      window.location.href = url
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start checkout")
      setLoadingPlan(null)
    }
  }

  const openPortal = async () => {
    setOpeningPortal(true)
    try {
      const { url } = await api<{ url: string }>("/api/business/billing/portal", { method: "POST" })
      window.location.href = url
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not open billing portal")
      setOpeningPortal(false)
    }
  }

  return (
    <Card className="p-5 shadow-none">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <p className="font-medium">Billing</p>
          <p className="text-sm text-muted-foreground">
            {canManage ? "Your subscription and payment method." : "Only an owner can manage billing."}
          </p>
        </div>

        {subscribed ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-secondary/30 px-4 py-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="font-medium capitalize">{PLANS.find((p) => p.id === plan)?.label ?? plan ?? "Plan"}</span>
                <Badge variant="outline" className={`border-transparent font-medium ${STATUS_TONE[subscriptionStatus!] ?? "bg-secondary text-muted-foreground"}`}>
                  {STATUS_LABEL[subscriptionStatus!] ?? subscriptionStatus}
                </Badge>
              </div>
              {currentPeriodEnd && (
                <p className="text-xs text-muted-foreground">
                  {subscriptionStatus === "canceled" ? "Access ends" : "Renews"} {new Date(currentPeriodEnd).toLocaleDateString()}
                </p>
              )}
            </div>
            {canManage && (
              <Button variant="outline" size="sm" onClick={openPortal} disabled={openingPortal}>
                {openingPortal ? <Loader2 className="size-4 animate-spin" /> : <ExternalLink className="size-4" />}
                Manage billing
              </Button>
            )}
          </div>
        ) : canManage ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {PLANS.map((p) => (
              <div key={p.id} className="flex flex-col gap-2 rounded-lg border border-border p-4">
                <p className="font-medium">{p.label}</p>
                <p className="text-2xl font-bold">{p.price}</p>
                <p className="text-xs text-muted-foreground">{p.description}</p>
                <Button
                  size="sm"
                  className="mt-2"
                  onClick={() => subscribe(p.id)}
                  disabled={loadingPlan !== null}
                >
                  {loadingPlan === p.id && <Loader2 className="size-4 animate-spin" />}
                  Subscribe
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">This business hasn&apos;t subscribed to a paid plan yet.</p>
        )}

        {subscribed && subscriptionStatus === "active" && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="size-3.5 text-success" />
            Payment method on file with Stripe — manage it, view invoices, or cancel from the billing portal above.
          </p>
        )}
      </div>
    </Card>
  )
}
