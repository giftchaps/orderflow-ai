"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Send } from "lucide-react"

interface Props {
  email: string
  businessId: string
}

export function ResendInviteButton({ email, businessId }: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle")
  const [message, setMessage] = useState<string | null>(null)

  const handleResend = async () => {
    setStatus("loading")
    setMessage(null)
    const res = await fetch("/api/admin/resend-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, business_id: businessId }),
    })
    const data = await res.json()
    if (res.ok && data.ok) {
      setStatus("done")
      setMessage(data.warning ?? `Invite sent to ${email}`)
    } else {
      setStatus("error")
      setMessage(data.error ?? "Failed to send invite.")
    }
  }

  return (
    <div className="space-y-2">
      <Button onClick={handleResend} disabled={status === "loading" || status === "done"} size="sm">
        <Send className="h-3.5 w-3.5 mr-2" />
        {status === "loading" ? "Sending..." : status === "done" ? "Invite Sent" : "Resend Invite Email"}
      </Button>
      {message && (
        <p className={`text-xs ${status === "error" ? "text-destructive" : "text-muted-foreground"}`}>
          {message}
        </p>
      )}
    </div>
  )
}
