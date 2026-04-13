"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function DemoRequestForm() {
  const [form, setForm] = useState({
    name: "",
    business_name: "",
    email: "",
    phone: "",
    business_type: "",
  })
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle")
  const [error, setError] = useState<string | null>(null)

  const update = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }))

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
      if (!response.ok) throw new Error(payload.error ?? "Unable to send request.")
      setStatus("success")
      setForm({ name: "", business_name: "", email: "", phone: "", business_type: "" })
    } catch (err) {
      setStatus("error")
      setError(err instanceof Error ? err.message : "Unable to send request.")
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="demo-name" className="text-sm text-white/70">Name</Label>
          <Input
            id="demo-name"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="Your name"
            className="border-white/10 bg-black/30 text-white placeholder:text-white/30"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="demo-business" className="text-sm text-white/70">Business name</Label>
          <Input
            id="demo-business"
            value={form.business_name}
            onChange={(e) => update("business_name", e.target.value)}
            placeholder="Provenzano's Deli"
            className="border-white/10 bg-black/30 text-white placeholder:text-white/30"
            required
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="demo-email" className="text-sm text-white/70">Email</Label>
          <Input
            id="demo-email"
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="you@restaurant.com"
            className="border-white/10 bg-black/30 text-white placeholder:text-white/30"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="demo-phone" className="text-sm text-white/70">Phone</Label>
          <Input
            id="demo-phone"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            placeholder="(203) 555-0101"
            className="border-white/10 bg-black/30 text-white placeholder:text-white/30"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="demo-type" className="text-sm text-white/70">Type of business</Label>
        <select
          id="demo-type"
          value={form.business_type}
          onChange={(e) => update("business_type", e.target.value)}
          className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
          required
        >
          <option value="" disabled className="bg-[#080808]">Select your business type</option>
          <option value="deli" className="bg-[#080808]">Deli / Sub shop</option>
          <option value="pizza" className="bg-[#080808]">Pizza / Takeout counter</option>
          <option value="bakery" className="bg-[#080808]">Bakery / Specialty shop</option>
          <option value="multi" className="bg-[#080808]">Multiple locations</option>
          <option value="other" className="bg-[#080808]">Other</option>
        </select>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {status === "success" && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-300">
          Request sent. We typically respond within a few hours.
        </div>
      )}

      <Button
        type="submit"
        disabled={status === "submitting"}
        className="w-full bg-red-600 text-white hover:bg-red-700"
      >
        {status === "submitting" ? "Sending..." : "Request a walkthrough"}
      </Button>

      <p className="text-center text-xs text-white/35">We typically respond within a few hours.</p>
    </form>
  )
}
