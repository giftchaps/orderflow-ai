"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Building2, Loader2, Mail, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api, ApiClientError } from "@/lib/api-client"

// lib/business.ts is server-only; keep a client-safe copy of the bits this form needs.
const PLANS = [
  { id: "starter", label: "Starter", price: "$49/mo", description: "Up to 100 orders per month" },
  { id: "growth", label: "Growth", price: "$99/mo", description: "Up to 500 orders per month" },
  { id: "pro", label: "Pro", price: "$149/mo", description: "Unlimited orders, priority support" },
] as const

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern (New York)" },
  { value: "America/Chicago", label: "Central (Chicago)" },
  { value: "America/Denver", label: "Mountain (Denver)" },
  { value: "America/Phoenix", label: "Arizona (Phoenix)" },
  { value: "America/Los_Angeles", label: "Pacific (Los Angeles)" },
  { value: "America/Anchorage", label: "Alaska" },
  { value: "Pacific/Honolulu", label: "Hawaii" },
]

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
}

type MenuItem = { name: string; description?: string; aliases?: string[]; active?: boolean; prices?: Record<string, number> }
type MenuCategory = { name: string; items: MenuItem[] }

export function OnboardingWizard() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [slugTouched, setSlugTouched] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [menu, setMenu] = useState<{ categories: MenuCategory[] } | null>(null)

  const [form, setForm] = useState({
    name: "",
    slug: "",
    address: "",
    timezone: "America/New_York",
    prep_time_minutes: 15,
    plan: "starter" as (typeof PLANS)[number]["id"],
    owner_name: "",
    owner_email: "",
    defer_invite: false,
  })

  const setName = (name: string) => {
    setForm((f) => ({ ...f, name, slug: slugTouched ? f.slug : slugify(name) }))
  }

  const handleMenuUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setExtracting(true)
    try {
      const formData = new FormData()
      formData.append("image", file)
      const res = await fetch("/api/menu/extract", { method: "POST", body: formData })
      const data = await res.json()
      if (!res.ok || data.ok === false) throw new Error(data.error ?? "Could not read that menu photo.")
      setMenu({ categories: data.categories ?? [] })
      toast.success(`Extracted ${data.categories?.length ?? 0} categories from the photo.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read that menu photo.")
    } finally {
      setExtracting(false)
      e.target.value = ""
    }
  }

  const menuItemCount = menu?.categories.reduce((sum, c) => sum + c.items.length, 0) ?? 0

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const slug = form.slug || slugify(form.name)
      const result = await api<{ business_id: string; slug: string; invite_sent: boolean; warning?: string }>(
        "/api/admin/onboard",
        {
          body: {
            name: form.name.trim(),
            slug,
            address: form.address.trim() || undefined,
            timezone: form.timezone,
            prep_time_minutes: form.prep_time_minutes,
            plan: form.plan,
            owner_name: form.owner_name.trim() || undefined,
            owner_email: form.owner_email.trim(),
            menu: menu && menuItemCount > 0 ? menu : undefined,
            defer_invite: form.defer_invite,
          },
        }
      )

      if (result.warning) toast.warning(result.warning)
      else toast.success(form.defer_invite ? "Business created." : `Business created and invite sent to ${form.owner_email.trim()}.`)

      router.push(`/admin/businesses/${result.slug}`)
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Could not create the business.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-5 p-5 shadow-none">
            <div className="flex items-center gap-2">
              <Building2 className="size-4 text-muted-foreground" />
              <p className="font-medium">Business details</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Business name">
                <Input value={form.name} onChange={(e) => setName(e.target.value)} placeholder="Provenzano's Deli" required />
              </Field>
              <Field label="Slug" hint="Used in the kitchen display URL.">
                <Input
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true)
                    setForm({ ...form, slug: slugify(e.target.value) })
                  }}
                  placeholder="provenzanos-deli"
                  pattern="[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?"
                  className="font-mono text-sm"
                  required
                />
              </Field>
            </div>

            <Field label="Address (optional)">
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="153 Saw Mill Road, West Haven, CT" />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Timezone">
                <Select value={form.timezone} onValueChange={(v) => setForm({ ...form, timezone: v })}>
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
                />
              </Field>
            </div>

            <Field label="Plan">
              <Select value={form.plan} onValueChange={(v) => setForm({ ...form, plan: v as typeof form.plan })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLANS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label} · {p.price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{PLANS.find((p) => p.id === form.plan)?.description}</p>
            </Field>
          </Card>

          <Card className="flex flex-col gap-5 p-5 shadow-none">
            <div className="flex items-center gap-2">
              <Mail className="size-4 text-muted-foreground" />
              <p className="font-medium">Owner</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Owner name (optional)">
                <Input value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} placeholder="Maria Provenzano" />
              </Field>
              <Field label="Owner email">
                <Input
                  type="email"
                  value={form.owner_email}
                  onChange={(e) => setForm({ ...form, owner_email: e.target.value })}
                  placeholder="owner@restaurant.com"
                  required
                />
              </Field>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border bg-secondary/30 px-4 py-3">
              <div className="flex flex-col gap-0.5">
                <Label htmlFor="defer-invite">Hold the invite</Label>
                <p className="text-xs text-muted-foreground">Create the business without emailing the owner yet.</p>
              </div>
              <Switch id="defer-invite" checked={form.defer_invite} onCheckedChange={(v) => setForm({ ...form, defer_invite: v })} />
            </div>
          </Card>

          <Card className="flex flex-col gap-4 p-5 shadow-none">
            <div className="flex items-center gap-2">
              <Upload className="size-4 text-muted-foreground" />
              <p className="font-medium">Menu (optional)</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Upload a photo of the menu to pre-fill it. You can also add or edit items later from the business&apos;s Menu page.
            </p>
            <div className="flex items-center gap-3">
              <Label htmlFor="onboard-menu-upload" className="cursor-pointer">
                <Button type="button" variant="outline" asChild disabled={extracting}>
                  <span>
                    {extracting ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                    Upload menu photo
                  </span>
                </Button>
              </Label>
              <input id="onboard-menu-upload" type="file" accept="image/*" className="hidden" onChange={handleMenuUpload} disabled={extracting} />
              {menu && (
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  {menu.categories.length} categories · {menuItemCount} items
                  <button type="button" onClick={() => setMenu(null)} className="text-muted-foreground hover:text-destructive" aria-label="Remove extracted menu">
                    <X className="size-3.5" />
                  </button>
                </span>
              )}
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-3 p-5 shadow-none">
            <p className="font-medium">Before you submit</p>
            <ul className="flex flex-col gap-2 text-sm text-pretty text-muted-foreground">
              <li>A tenant is created with its own kitchen display at /display/{form.slug || "slug"}.</li>
              <li>{form.defer_invite ? "No invite email is sent — the owner row is created as pending." : "The owner gets an email invite immediately."}</li>
              <li>Connect the phone number and Vapi assistant afterwards from the Agent tab.</li>
            </ul>
          </Card>
          <Button type="submit" size="lg" disabled={submitting || !form.name || !form.slug || !form.owner_email}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Create business
          </Button>
        </div>
      </div>
    </form>
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
