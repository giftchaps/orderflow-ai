"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, PhoneCall } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/api-client"
import type { AdminBusiness } from "./tabs"

export function AgentPanel({ business }: { business: AdminBusiness }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    phone_number: business.phone_number ?? "",
    sms_from_number: business.sms_from_number ?? "",
    vapi_assistant_id: business.vapi_assistant_id ?? "",
    ai_greeting: business.ai_greeting ?? "",
  })

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api(`/api/admin/businesses/${business.id}`, {
        method: "PATCH",
        body: {
          phone_number: form.phone_number.trim() || null,
          sms_from_number: form.sms_from_number.trim() || null,
          vapi_assistant_id: form.vapi_assistant_id.trim() || null,
          ai_greeting: form.ai_greeting.trim() || null,
        },
      })
      toast.success("Agent settings saved")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save")
    } finally {
      setSaving(false)
    }
  }

  const connected = Boolean(business.vapi_assistant_id && business.phone_number)

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="p-5 shadow-none">
        <form onSubmit={save} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <p className="font-medium">Phone agent</p>
            <p className="text-sm text-muted-foreground">
              Telephony and Vapi assistant wiring. These values are platform-managed — the business cannot edit them.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Customer phone number" hint="The number customers call. E.164, e.g. +15551234567.">
              <Input
                value={form.phone_number}
                onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                placeholder="+1…"
                inputMode="tel"
              />
            </Field>
            <Field label="SMS sender number" hint="Telnyx number used for confirmations. Leave blank to use the platform default.">
              <Input
                value={form.sms_from_number}
                onChange={(e) => setForm({ ...form, sms_from_number: e.target.value })}
                placeholder="+1…"
                inputMode="tel"
              />
            </Field>
          </div>

          <Field label="Vapi assistant ID" hint="Found in the Vapi dashboard under Assistants.">
            <Input
              value={form.vapi_assistant_id}
              onChange={(e) => setForm({ ...form, vapi_assistant_id: e.target.value })}
              placeholder="asst_…"
              className="font-mono text-sm"
            />
          </Field>

          <Field label="Greeting override" hint="Optional. The opening line the assistant uses for this business.">
            <Textarea
              value={form.ai_greeting}
              onChange={(e) => setForm({ ...form, ai_greeting: e.target.value })}
              rows={3}
              maxLength={400}
              placeholder={`Thanks for calling ${business.name}! What can I get started for you?`}
            />
          </Field>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              Save agent settings
            </Button>
          </div>
        </form>
      </Card>

      <Card className="flex flex-col gap-4 p-5 shadow-none">
        <div className="flex items-center gap-3">
          <span className={`flex size-9 items-center justify-center rounded-lg ${connected ? "bg-status-ready-bg text-success" : "bg-secondary text-muted-foreground"}`}>
            <PhoneCall className="size-4" />
          </span>
          <div className="flex flex-col">
            <p className="text-sm font-medium">{connected ? "Agent connected" : "Agent not connected"}</p>
            <p className="text-xs text-muted-foreground">
              {connected ? "Calls to the number above create orders here." : "Set both a phone number and an assistant ID."}
            </p>
          </div>
        </div>
        <dl className="flex flex-col gap-2 text-sm">
          <Row label="Business ID" value={business.id} mono />
          <Row label="Webhook" value="POST /api/orders" mono />
          <Row label="Auth" value="Bearer SUPABASE_SERVICE_ROLE_KEY" mono />
        </dl>
        <p className="text-pretty text-xs text-muted-foreground">
          The backend resolves the tenant from <code className="font-mono">business_id</code> in the payload (or the Vapi
          assistant ID). See <code className="font-mono">docs/API_CONTRACT.md</code>.
        </p>
      </Card>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={mono ? "break-all font-mono text-xs" : ""}>{value}</dd>
    </div>
  )
}
