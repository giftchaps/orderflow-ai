"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Copy, ExternalLink, KeyRound, Loader2, Lock, Unlock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api-client"
import { cn } from "@/lib/utils"

/**
 * Kitchen display link + PIN management. `apiPath` is the PATCH endpoint that
 * accepts `{ display_pin: string | null }` for the current actor.
 */
export function DisplaySettings({
  displayUrl,
  hasPin,
  apiPath,
  className,
}: {
  displayUrl: string
  hasPin: boolean
  apiPath: string
  className?: string
}) {
  const router = useRouter()
  const [pin, setPin] = useState("")
  const [saving, setSaving] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(displayUrl)
    toast.success("Display link copied")
  }

  const savePin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^\d{4,8}$/.test(pin)) return toast.error("PIN must be 4-8 digits.")
    setSaving(true)
    try {
      await api(apiPath, { method: "PATCH", body: { display_pin: pin } })
      toast.success("Display PIN updated. Screens will ask for the new PIN on next load.")
      setPin("")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update PIN")
    } finally {
      setSaving(false)
    }
  }

  const clearPin = async () => {
    setSaving(true)
    try {
      await api(apiPath, { method: "PATCH", body: { display_pin: null } })
      toast.success("PIN removed. The display is open to anyone with the link.")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove PIN")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={cn("grid gap-6 lg:grid-cols-2", className)}>
      <Card className="flex flex-col gap-4 p-5 shadow-none">
        <div className="flex flex-col gap-1">
          <p className="font-medium">Kitchen display link</p>
          <p className="text-sm text-muted-foreground">Open this on the kitchen tablet or TV. It stays signed in and refreshes live.</p>
        </div>
        <div className="flex items-center gap-2">
          <Input readOnly value={displayUrl} className="font-mono text-xs" aria-label="Kitchen display URL" />
          <Button type="button" variant="outline" size="icon" onClick={copy} aria-label="Copy display link">
            <Copy className="size-4" />
          </Button>
          <Button asChild variant="outline" size="icon" aria-label="Open display">
            <a href={displayUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" />
            </a>
          </Button>
        </div>
      </Card>

      <Card className="flex flex-col gap-4 p-5 shadow-none">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <p className="font-medium">Display PIN</p>
            <p className="text-sm text-muted-foreground">
              {hasPin ? "Staff enter this PIN once per device." : "No PIN set — anyone with the link can open the display."}
            </p>
          </div>
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg",
              hasPin ? "bg-status-ready-bg text-success" : "bg-status-pending-bg text-warning-foreground"
            )}
          >
            {hasPin ? <Lock className="size-4" /> : <Unlock className="size-4" />}
          </span>
        </div>

        <form onSubmit={savePin} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="display-pin">{hasPin ? "New PIN" : "Set a PIN"}</Label>
            <div className="flex items-center gap-2">
              <Input
                id="display-pin"
                inputMode="numeric"
                pattern="\d{4,8}"
                maxLength={8}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="4-8 digits"
                className="font-mono tracking-widest"
              />
              <Button type="submit" disabled={saving || pin.length < 4}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
                Save
              </Button>
            </div>
          </div>
          {hasPin && (
            <button type="button" onClick={clearPin} disabled={saving} className="self-start text-xs text-muted-foreground underline-offset-2 hover:underline">
              Remove PIN
            </button>
          )}
        </form>
      </Card>
    </div>
  )
}
