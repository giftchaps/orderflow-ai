"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { api } from "@/lib/api-client"
import type { PlanTier } from "@/lib/business-shared"

type FormState = {
  label: string
  price: string // dollars, as typed
  monthlyOrderLimit: string // blank = unlimited
  staffSeatLimit: string // blank = unlimited
  prioritySupport: boolean
  stripePriceId: string
}

function toForm(tier: PlanTier): FormState {
  return {
    label: tier.label,
    price: (tier.priceCents / 100).toString(),
    monthlyOrderLimit: tier.monthlyOrderLimit?.toString() ?? "",
    staffSeatLimit: tier.staffSeatLimit?.toString() ?? "",
    prioritySupport: tier.prioritySupport,
    stripePriceId: tier.stripePriceId ?? "",
  }
}

export function PlansManager({ tiers }: { tiers: PlanTier[] }) {
  const router = useRouter()
  const [forms, setForms] = useState<Record<string, FormState>>(Object.fromEntries(tiers.map((t) => [t.id, toForm(t)])))
  const [saving, setSaving] = useState<string | null>(null)

  const setField = <K extends keyof FormState>(id: string, key: K, value: FormState[K]) =>
    setForms((prev) => ({ ...prev, [id]: { ...prev[id], [key]: value } }))

  const save = async (tier: PlanTier) => {
    const form = forms[tier.id]
    const priceDollars = Number(form.price)
    if (!Number.isFinite(priceDollars) || priceDollars < 0) return toast.error("Enter a valid price.")

    setSaving(tier.id)
    try {
      await api(`/api/admin/plans/${tier.id}`, {
        method: "PATCH",
        body: {
          label: form.label.trim() || tier.label,
          priceCents: Math.round(priceDollars * 100),
          monthlyOrderLimit: form.monthlyOrderLimit.trim() === "" ? null : Number(form.monthlyOrderLimit),
          staffSeatLimit: form.staffSeatLimit.trim() === "" ? null : Number(form.staffSeatLimit),
          prioritySupport: form.prioritySupport,
          stripePriceId: form.stripePriceId.trim() || null,
        },
      })
      toast.success(`${form.label || tier.label} plan updated`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save plan")
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {tiers.map((tier) => {
        const form = forms[tier.id]
        const busy = saving === tier.id
        return (
          <Card key={tier.id} className="flex flex-col gap-4 p-5 shadow-none">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${tier.id}-label`}>Plan name</Label>
              <Input id={`${tier.id}-label`} value={form.label} onChange={(e) => setField(tier.id, "label", e.target.value)} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${tier.id}-price`}>Price (USD / month)</Label>
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-muted-foreground">$</span>
                <Input
                  id={`${tier.id}-price`}
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setField(tier.id, "price", e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Display only. Stripe prices are immutable — to actually change what this plan charges, create a new
                Price in Stripe and paste its id below.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${tier.id}-orders`}>Order limit / mo</Label>
                <Input
                  id={`${tier.id}-orders`}
                  type="number"
                  min={1}
                  placeholder="Unlimited"
                  value={form.monthlyOrderLimit}
                  onChange={(e) => setField(tier.id, "monthlyOrderLimit", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${tier.id}-seats`}>Team seats</Label>
                <Input
                  id={`${tier.id}-seats`}
                  type="number"
                  min={1}
                  placeholder="Unlimited"
                  value={form.staffSeatLimit}
                  onChange={(e) => setField(tier.id, "staffSeatLimit", e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Order limit is informational only — the business gets a nudge to upgrade, but a real phone order is
              never blocked. The seat limit is enforced when someone tries to invite a new team member past it.
            </p>

            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <Label htmlFor={`${tier.id}-priority`} className="cursor-pointer">
                Priority support
              </Label>
              <Switch
                id={`${tier.id}-priority`}
                checked={form.prioritySupport}
                onCheckedChange={(v) => setField(tier.id, "prioritySupport", v)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${tier.id}-stripe`}>Stripe Price ID</Label>
              <Input
                id={`${tier.id}-stripe`}
                className="font-mono text-xs"
                placeholder="price_..."
                value={form.stripePriceId}
                onChange={(e) => setField(tier.id, "stripePriceId", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {form.stripePriceId ? "Businesses subscribing to this plan will be charged this Stripe Price." : "Not set — Checkout will fail for this plan until you add one."}
              </p>
            </div>

            <Button onClick={() => save(tier)} disabled={busy} className="mt-auto">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Save {form.label || tier.label}
            </Button>
          </Card>
        )
      })}
    </div>
  )
}
