"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Copy, Check, Eye, EyeOff } from "lucide-react"

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
  display_pin: string | null
}

interface Props {
  business: Business
  kitchenUrl: string
}

export function SettingsForm({ business: initial, kitchenUrl }: Props) {
  const [business, setBusiness] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [pin, setPin] = useState("")
  const [pinConfirm, setPinConfirm] = useState("")
  const [showPin, setShowPin] = useState(false)
  const [pinSaving, setPinSaving] = useState(false)
  const [pinMsg, setPinMsg] = useState<{ ok: boolean; text: string } | null>(null)

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

  const handleSavePin = async () => {
    if (pin.length < 4 || pin.length > 8 || !/^\d+$/.test(pin)) {
      setPinMsg({ ok: false, text: "PIN must be 4–8 digits." })
      return
    }
    if (pin !== pinConfirm) {
      setPinMsg({ ok: false, text: "PINs do not match." })
      return
    }
    setPinSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from("businesses").update({ display_pin: pin }).eq("id", business.id)
    setPinSaving(false)
    if (error) {
      setPinMsg({ ok: false, text: "Failed to save PIN." })
    } else {
      setBusiness({ ...business, display_pin: pin })
      setPin("")
      setPinConfirm("")
      setPinMsg({ ok: true, text: "PIN saved!" })
    }
    setTimeout(() => setPinMsg(null), 3000)
  }

  const handleClearPin = async () => {
    const supabase = createClient()
    await supabase.from("businesses").update({ display_pin: null }).eq("id", business.id)
    setBusiness({ ...business, display_pin: null })
    setPinMsg({ ok: true, text: "PIN removed. Display is now open access." })
    setTimeout(() => setPinMsg(null), 3000)
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

      {/* Kitchen Display PIN */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle>Kitchen Display PIN</CardTitle>
          <CardDescription>
            Staff must enter this PIN to access the kitchen display at your display URL.
            {business.display_pin ? " A PIN is currently set." : " No PIN set — display is open access."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>New PIN (4–8 digits)</Label>
            <div className="relative w-48">
              <Input
                type={showPin ? "text" : "password"}
                inputMode="numeric"
                maxLength={8}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                className="pr-9"
              />
              <button
                type="button"
                onClick={() => setShowPin((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Confirm PIN</Label>
            <Input
              type={showPin ? "text" : "password"}
              inputMode="numeric"
              maxLength={8}
              value={pinConfirm}
              onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ""))}
              placeholder="••••"
              className="w-48"
            />
          </div>
          {pinMsg && (
            <p className={`text-sm ${pinMsg.ok ? "text-green-500" : "text-destructive"}`}>{pinMsg.text}</p>
          )}
          <div className="flex gap-2">
            <Button onClick={handleSavePin} disabled={pinSaving}>
              {pinSaving ? "Saving..." : business.display_pin ? "Update PIN" : "Set PIN"}
            </Button>
            {business.display_pin && (
              <Button variant="outline" onClick={handleClearPin}>
                Remove PIN
              </Button>
            )}
          </div>
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
