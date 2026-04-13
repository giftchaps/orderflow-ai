"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function DemoRequestForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    business_name: "",
    phone: "",
    message: "",
  })
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle")
  const [error, setError] = useState<string | null>(null)

  const update = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setStatus("submitting")
    setError(null)

    try {
      const response = await fetch("/api/demo-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to send demo request.")
      }

      setStatus("success")
      setForm({ name: "", email: "", business_name: "", phone: "", message: "" })
    } catch (submitError) {
      setStatus("error")
      setError(submitError instanceof Error ? submitError.message : "Unable to send demo request.")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="demo-name" className="text-white">Name</Label>
          <Input
            id="demo-name"
            value={form.name}
            onChange={(event) => update("name", event.target.value)}
            placeholder="Your name"
            className="border-white/10 bg-black/20 text-white placeholder:text-white/35"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="demo-email" className="text-white">Email</Label>
          <Input
            id="demo-email"
            type="email"
            value={form.email}
            onChange={(event) => update("email", event.target.value)}
            placeholder="you@restaurant.com"
            className="border-white/10 bg-black/20 text-white placeholder:text-white/35"
            required
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="demo-business" className="text-white">Business name</Label>
          <Input
            id="demo-business"
            value={form.business_name}
            onChange={(event) => update("business_name", event.target.value)}
            placeholder="Provenzano's Deli"
            className="border-white/10 bg-black/20 text-white placeholder:text-white/35"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="demo-phone" className="text-white">Phone</Label>
          <Input
            id="demo-phone"
            value={form.phone}
            onChange={(event) => update("phone", event.target.value)}
            placeholder="(203) 555-0101"
            className="border-white/10 bg-black/20 text-white placeholder:text-white/35"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="demo-message" className="text-white">What do you want to automate?</Label>
        <Textarea
          id="demo-message"
          value={form.message}
          onChange={(event) => update("message", event.target.value)}
          placeholder="Tell us about your call volume, menu, and current workflow."
          className="min-h-[120px] border-white/10 bg-black/20 text-white placeholder:text-white/35"
        />
      </div>

      {error ? (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {status === "success" ? (
        <div className="rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-200">
          Thanks. Your demo request was sent. We’ll reach out soon.
        </div>
      ) : null}

      <Button type="submit" disabled={status === "submitting"} className="w-full bg-[oklch(0.55_0.2_25)] text-white hover:bg-[oklch(0.5_0.2_25)]">
        {status === "submitting" ? "Sending..." : "Request a demo"}
      </Button>
    </form>
  )
}
