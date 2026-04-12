"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, Upload, Loader2, ChevronRight, ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"

const STEPS = ["Business Details", "Owner Account", "Menu Upload", "Confirm & Create"]

const PLANS = [
  { id: "starter", label: "Starter", price: "$49/mo", description: "Up to 100 orders/month" },
  { id: "growth", label: "Growth", price: "$99/mo", description: "Up to 500 orders/month" },
  { id: "pro", label: "Pro", price: "$149/mo", description: "Unlimited orders" },
]

export default function OnboardBusinessPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [extractedMenu, setExtractedMenu] = useState<any>(null)

  const [form, setForm] = useState({
    name: "",
    slug: "",
    address: "",
    timezone: "America/New_York",
    prep_time: 15,
    owner_name: "",
    owner_email: "",
    plan: "growth",
    menu: null as any,
  })

  const set = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }))

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")

  const handleMenuUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setExtracting(true)
    setError(null)

    const formData = new FormData()
    formData.append("image", file)

    try {
      const res = await fetch("/api/menu/extract", { method: "POST", body: formData })
      const data = await res.json()
      if (data.categories) {
        setExtractedMenu(data)
        set("menu", data)
      } else {
        setError("Could not extract menu. Try a clearer photo or add items manually.")
      }
    } catch {
      setError("Menu extraction failed. Please try again.")
    } finally {
      setExtracting(false)
    }
  }

  const handleCreate = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? "Failed to create business")
      router.push(`/admin/businesses/${form.slug}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      setLoading(false)
    }
  }

  const totalItems = extractedMenu?.categories?.reduce(
    (acc: number, cat: any) => acc + (cat.items?.length ?? 0), 0
  ) ?? 0

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Onboard New Business</h1>
        <p className="text-muted-foreground text-sm mt-1">Set up a new restaurant on OrderFlow AI</p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center gap-2 flex-1 last:flex-none">
            <div className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0",
              i < step ? "bg-green-600 text-white" : i === step ? "bg-[oklch(0.55_0.2_25)] text-white" : "bg-secondary text-muted-foreground"
            )}>
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={cn("text-sm hidden sm:block", i === step ? "font-medium" : "text-muted-foreground")}>{label}</span>
            {i < STEPS.length - 1 && <div className="flex-1 h-px bg-border mx-1" />}
          </div>
        ))}
      </div>

      <Card className="border-border">
        {/* STEP 1 — Business Details */}
        {step === 0 && (
          <>
            <CardHeader>
              <CardTitle>Business Details</CardTitle>
              <CardDescription>Basic information about the restaurant</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Business Name</Label>
                <Input value={form.name} onChange={(e) => {
                  set("name", e.target.value)
                  set("slug", generateSlug(e.target.value))
                }} placeholder="Provenzano's Deli" />
              </div>
              <div className="space-y-2">
                <Label>URL Slug</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm">/display/</span>
                  <Input value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="provenzanos-deli" />
                </div>
                <p className="text-xs text-muted-foreground">Kitchen display will be at /display/{form.slug || "slug"}</p>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="153 Saw Mill Road, West Haven, CT" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    value={form.timezone}
                    onChange={(e) => set("timezone", e.target.value)}
                  >
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Chicago">Central Time</option>
                    <option value="America/Denver">Mountain Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Prep Time (minutes)</Label>
                  <Input type="number" value={form.prep_time} onChange={(e) => set("prep_time", parseInt(e.target.value))} min={5} max={60} />
                </div>
              </div>
            </CardContent>
          </>
        )}

        {/* STEP 2 — Owner Account */}
        {step === 1 && (
          <>
            <CardHeader>
              <CardTitle>Owner Account</CardTitle>
              <CardDescription>An invite will be sent to the owner's email</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Owner Full Name</Label>
                <Input value={form.owner_name} onChange={(e) => set("owner_name", e.target.value)} placeholder="John Provenzano" />
              </div>
              <div className="space-y-2">
                <Label>Owner Email</Label>
                <Input type="email" value={form.owner_email} onChange={(e) => set("owner_email", e.target.value)} placeholder="john@provenzanos.com" />
              </div>
              <div className="space-y-3">
                <Label>Plan</Label>
                <div className="grid gap-3">
                  {PLANS.map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => set("plan", plan.id)}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-lg border text-left transition-colors",
                        form.plan === plan.id ? "border-[oklch(0.55_0.2_25)] bg-[oklch(0.55_0.2_25)]/10" : "border-border hover:bg-secondary/50"
                      )}
                    >
                      <div>
                        <p className="font-medium">{plan.label}</p>
                        <p className="text-sm text-muted-foreground">{plan.description}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">{plan.price}</span>
                        {form.plan === plan.id && <Check className="h-4 w-4 text-[oklch(0.55_0.2_25)]" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </>
        )}

        {/* STEP 3 — Menu Upload */}
        {step === 2 && (
          <>
            <CardHeader>
              <CardTitle>Menu Upload</CardTitle>
              <CardDescription>Upload a photo of the menu — our AI will extract it automatically</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!extractedMenu ? (
                <div className="border-2 border-dashed border-border rounded-lg p-12 text-center space-y-4">
                  {extracting ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Reading menu...</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-muted-foreground mx-auto" />
                      <div>
                        <p className="font-medium">Upload menu photo</p>
                        <p className="text-sm text-muted-foreground mt-1">JPG, PNG up to 10MB</p>
                      </div>
                      <Label htmlFor="menu-upload" className="cursor-pointer">
                        <Button variant="outline" asChild>
                          <span>Choose file</span>
                        </Button>
                      </Label>
                      <input id="menu-upload" type="file" accept="image/*" className="hidden" onChange={handleMenuUpload} />
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">Menu extracted: {totalItems} items across {extractedMenu.categories?.length} categories</span>
                    </div>
                    <Label htmlFor="menu-reupload" className="cursor-pointer">
                      <Button variant="ghost" size="sm" asChild>
                        <span>Re-upload</span>
                      </Button>
                    </Label>
                    <input id="menu-reupload" type="file" accept="image/*" className="hidden" onChange={handleMenuUpload} />
                  </div>
                  <div className="border border-border rounded-lg divide-y divide-border max-h-64 overflow-y-auto">
                    {extractedMenu.categories?.map((cat: any) => (
                      <div key={cat.name} className="px-4 py-3">
                        <p className="font-medium text-sm">{cat.name} <span className="text-muted-foreground font-normal">({cat.items?.length} items)</span></p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {cat.items?.slice(0, 5).map((item: any) => (
                            <Badge key={item.name} variant="secondary" className="text-xs">{item.name}</Badge>
                          ))}
                          {cat.items?.length > 5 && <Badge variant="secondary" className="text-xs">+{cat.items.length - 5} more</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setExtractedMenu(null); set("menu", null) }} disabled={!extractedMenu}>
                  Skip for now
                </Button>
                <p className="text-xs text-muted-foreground">You can add the menu later in the business portal</p>
              </div>
            </CardContent>
          </>
        )}

        {/* STEP 4 — Confirm */}
        {step === 3 && (
          <>
            <CardHeader>
              <CardTitle>Confirm & Create</CardTitle>
              <CardDescription>Review the details before creating the business</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border divide-y divide-border">
                <div className="px-4 py-3 flex justify-between">
                  <span className="text-sm text-muted-foreground">Business</span>
                  <span className="text-sm font-medium">{form.name}</span>
                </div>
                <div className="px-4 py-3 flex justify-between">
                  <span className="text-sm text-muted-foreground">Address</span>
                  <span className="text-sm font-medium">{form.address || "—"}</span>
                </div>
                <div className="px-4 py-3 flex justify-between">
                  <span className="text-sm text-muted-foreground">Kitchen Display URL</span>
                  <span className="text-sm font-medium">/display/{form.slug}</span>
                </div>
                <div className="px-4 py-3 flex justify-between">
                  <span className="text-sm text-muted-foreground">Owner</span>
                  <span className="text-sm font-medium">{form.owner_name} ({form.owner_email})</span>
                </div>
                <div className="px-4 py-3 flex justify-between">
                  <span className="text-sm text-muted-foreground">Plan</span>
                  <Badge variant="outline" className="capitalize">{form.plan}</Badge>
                </div>
                <div className="px-4 py-3 flex justify-between">
                  <span className="text-sm text-muted-foreground">Menu</span>
                  <span className="text-sm font-medium">{totalItems > 0 ? `${totalItems} items` : "Not uploaded"}</span>
                </div>
              </div>
              {error && (
                <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
              )}
            </CardContent>
          </>
        )}
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={step === 0}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={
            (step === 0 && (!form.name || !form.slug)) ||
            (step === 1 && (!form.owner_name || !form.owner_email))
          }>
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleCreate} disabled={loading} className="bg-green-600 hover:bg-green-700">
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</> : "Create Business"}
          </Button>
        )}
      </div>
    </div>
  )
}
