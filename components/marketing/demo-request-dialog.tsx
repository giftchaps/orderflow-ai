"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type Status = "idle" | "submitting" | "success" | "error"

export function DemoRequestDialog({
  open,
  onOpenChange,
  initialEmail = "",
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialEmail?: string
}) {
  const [form, setForm] = useState({ name: "", email: initialEmail, business_name: "", phone: "", message: "" })
  const [status, setStatus] = useState<Status>("idle")
  const [error, setError] = useState<string | null>(null)
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null)

  // Radix portals dialog content to document.body by default, which sits outside
  // the marketing layout's themed wrapper (its warm-cream palette is applied via
  // CSS variables on that wrapper, not globally) — render inside it instead so the
  // dialog doesn't fall back to the site-wide dark theme.
  useEffect(() => {
    setPortalContainer(document.getElementById("marketing-theme-root"))
  }, [])

  // Pick up a freshly typed hero/CTA email each time the dialog opens.
  useEffect(() => {
    if (open && initialEmail) setForm((prev) => (prev.email ? prev : { ...prev, email: initialEmail }))
  }, [open, initialEmail])

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next)
    if (!next) {
      // Reset after the close animation so the form doesn't visibly flash blank.
      setTimeout(() => {
        setStatus("idle")
        setError(null)
        setForm({ name: "", email: "", business_name: "", phone: "", message: "" })
      }, 200)
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("submitting")
    setError(null)
    try {
      const res = await fetch("/api/demo-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
      if (!res.ok || data.error) throw new Error(data.error ?? "Something went wrong. Please try again.")
      setStatus("success")
    } catch (err) {
      setStatus("error")
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent container={portalContainer} className="max-w-md">
        {status === "success" ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-accent/10">
              <CheckCircle2 className="size-6 text-accent" />
            </span>
            <div className="flex flex-col gap-1">
              <p className="text-lg font-medium text-foreground">Request received</p>
              <p className="text-sm text-muted-foreground">
                We&apos;ll reach out to {form.email || "you"} shortly to set up a walkthrough.
              </p>
            </div>
            <Button onClick={() => handleOpenChange(false)}>Done</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Request access</DialogTitle>
              <DialogDescription>Tell us about your restaurant and we&apos;ll set up a 20-minute walkthrough.</DialogDescription>
            </DialogHeader>
            <form onSubmit={submit} className="flex flex-col gap-4 py-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="demo-name">Your name</Label>
                  <Input
                    id="demo-name"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Jamie Rivera"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="demo-email">Email</Label>
                  <Input
                    id="demo-email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="you@restaurant.com"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="demo-business">Restaurant name</Label>
                <Input
                  id="demo-business"
                  required
                  value={form.business_name}
                  onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                  placeholder="Provenzano's Deli"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="demo-phone">Phone (optional)</Label>
                <Input
                  id="demo-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="(203) 555-0147"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="demo-message">Anything we should know? (optional)</Label>
                <Textarea
                  id="demo-message"
                  rows={3}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Call volume, current setup, questions…"
                />
              </div>
              {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
              <DialogFooter>
                <Button type="submit" disabled={status === "submitting"} className="w-full sm:w-auto">
                  {status === "submitting" && <Loader2 className="size-4 animate-spin" />}
                  Request access
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
