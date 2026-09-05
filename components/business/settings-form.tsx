"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DisplaySettings } from "@/components/portal/display-settings"
import { api } from "@/lib/api-client"
import type { BusinessRecord } from "@/lib/business-shared"

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern (New York)" },
  { value: "America/Chicago", label: "Central (Chicago)" },
  { value: "America/Denver", label: "Mountain (Denver)" },
  { value: "America/Phoenix", label: "Arizona (Phoenix)" },
  { value: "America/Los_Angeles", label: "Pacific (Los Angeles)" },
  { value: "America/Anchorage", label: "Alaska" },
  { value: "Pacific/Honolulu", label: "Hawaii" },
]

export function BusinessSettingsForm({
  business,
  displayUrl,
  canEdit,
}: {
  business: BusinessRecord
  displayUrl: string
  canEdit: boolean
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: business.name,
    address: business.address ?? "",
    timezone: business.timezone ?? "America/New_York",
    prep_time_minutes: business.prep_time_minutes ?? 15,
    ai_greeting: business.ai_greeting ?? "",
    theme_color: business.theme_color ?? "",
  })

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const body: Record<string, unknown> = {}
      if (form.name !== business.name) body.name = form.name
      if (form.address !== (business.address ?? "")) body.address = form.address || null
      if (form.timezone !== business.timezone) body.timezone = form.timezone
      if (form.prep_time_minutes !== business.prep_time_minutes) body.prep_time_minutes = form.prep_time_minutes
      if (form.ai_greeting !== (business.ai_greeting ?? "")) body.ai_greeting = form.ai_greeting || null
      if (form.theme_color !== (business.theme_color ?? "")) body.theme_color = form.theme_color || null
      if (Object.keys(body).length === 0) return toast.info("No changes to save")
      await api("/api/business", { method: "PATCH", body })
      toast.success("Settings saved")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save settings")
    } finally {
      setSaving(false)
    }
  }

  const BRAND_PRESETS = ["#d92626", "#c2410c", "#b45309", "#15803d", "#0e7490", "#4338ca", "#a21caf", "#334155"]

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-5 shadow-none">
        <form onSubmit={save} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <p className="font-medium">Business profile</p>
            <p className="text-sm text-muted-foreground">
              {canEdit ? "Visible to customers and used by the phone agent." : "Only an owner can edit these fields."}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Business name">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={!canEdit} required />
            </Field>
            <Field label="Address (optional)">
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} disabled={!canEdit} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Timezone">
              <Select value={form.timezone} onValueChange={(v) => setForm({ ...form, timezone: v })} disabled={!canEdit}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Prep time (minutes)">
              <Input
                type="number"
                min={1}
                max={240}
                value={form.prep_time_minutes}
                onChange={(e) => setForm({ ...form, prep_time_minutes: Number(e.target.value) || 1 })}
                disabled={!canEdit}
              />
            </Field>
          </div>

          <Field label="Greeting override (optional)" hint="The opening line the phone agent uses for this business.">
            <Textarea
              value={form.ai_greeting}
              onChange={(e) => setForm({ ...form, ai_greeting: e.target.value })}
              rows={3}
              maxLength={400}
              disabled={!canEdit}
              placeholder={`Thanks for calling ${business.name}! What can I get started for you?`}
            />
          </Field>

          <div className="flex flex-col gap-1 border-t border-border pt-5">
            <p className="font-medium">Branding</p>
            <p className="text-sm text-muted-foreground">
              Your accent color, used on the kitchen display and throughout your dashboard.
            </p>
          </div>

          <Field label="Brand color" hint="Leave blank to use the OrderFlow default red.">
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="color"
                value={form.theme_color || "#d92626"}
                onChange={(e) => setForm({ ...form, theme_color: e.target.value })}
                disabled={!canEdit}
                className="h-10 w-14 cursor-pointer rounded-md border border-input bg-transparent p-1 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <Input
                value={form.theme_color}
                onChange={(e) => setForm({ ...form, theme_color: e.target.value })}
                placeholder="#d92626"
                disabled={!canEdit}
                className="w-32 font-mono text-sm"
              />
              {canEdit && form.theme_color && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setForm({ ...form, theme_color: "" })}>
                  Reset to default
                </Button>
              )}
              {canEdit && (
                <div className="flex items-center gap-1.5">
                  {BRAND_PRESETS.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      title={hex}
                      onClick={() => setForm({ ...form, theme_color: hex })}
                      className="size-6 rounded-full border border-black/10 transition-transform hover:scale-110"
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              )}
            </div>
          </Field>

          {canEdit && (
            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="size-4 animate-spin" />}
                Save changes
              </Button>
            </div>
          )}
        </form>
      </Card>

      <DisplaySettings displayUrl={displayUrl} hasPin={Boolean(business.display_pin_hash || business.display_pin)} apiPath="/api/business" />
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
