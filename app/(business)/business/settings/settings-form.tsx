"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Copy, Check } from "lucide-react"

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8 px-2">
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  )
}

interface Business {
  id: string
  name: string | null
  slug: string | null
  address: string | null
  prep_time_minutes: number | null
  phone_number: string | null
  vapi_assistant_id: string | null
}

interface Props {
  business: Business
  kitchenUrl: string
}

export function SettingsForm({ business: initial, kitchenUrl }: Props) {
  const [business, setBusiness] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    const supabase = createClient()
    await supabase.from("businesses").update({
      name: business.name,
      address: business.address,
      prep_time_minutes: business.prep_time_minutes,
    }).eq("id", business.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="p-8 max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your business configuration</p>
      </div>

      {/* Business Info */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Business Name</Label>
            <Input
              value={business.name ?? ""}
              onChange={(e) => setBusiness({ ...business, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input
              value={business.address ?? ""}
              onChange={(e) => setBusiness({ ...business, address: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Prep Time (minutes)</Label>
            <Input
              type="number"
              value={business.prep_time_minutes ?? 15}
              onChange={(e) => setBusiness({ ...business, prep_time_minutes: parseInt(e.target.value) })}
              min={5}
              max={60}
              className="w-32"
            />
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saved ? "Saved!" : saving ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      {/* AI Agent Config (read only) */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle>AI Agent Configuration</CardTitle>
          <CardDescription>Managed by ResurgeX. Contact support to make changes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Phone Number</Label>
            <div className="flex items-center gap-2">
              <Input value={business.phone_number ?? "Not assigned"} readOnly className="bg-secondary/50" />
              {business.phone_number && <CopyButton value={business.phone_number} />}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Kitchen Display URL</Label>
            <div className="flex items-center gap-2">
              <Input value={kitchenUrl} readOnly className="bg-secondary/50" />
              {kitchenUrl && <CopyButton value={kitchenUrl} />}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className={`h-2.5 w-2.5 rounded-full ${business.vapi_assistant_id ? "bg-green-500 animate-pulse" : "bg-muted-foreground"}`} />
            <span className="text-sm text-muted-foreground">
              {business.vapi_assistant_id ? "Agent is live" : "Agent not configured"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
