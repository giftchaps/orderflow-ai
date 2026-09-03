import "server-only"

import { getServerEnv } from "@/lib/env"
import { createSupabaseServerClient } from "@/lib/supabase/server"

type SmsInput = {
  businessId: string
  orderId?: string | null
  to: string
  body: string
  kind: "order_received" | "order_ready" | "other"
  /** Per-business sender overrides the platform default. */
  from?: string | null
}

/**
 * Send an SMS via Telnyx and record it in sms_messages.
 * Never throws — messaging failures must not block order workflow.
 */
export async function sendSms(input: SmsInput): Promise<{ sent: boolean; error?: string }> {
  const env = getServerEnv()
  const from = input.from ?? env.TELNYX_FROM_NUMBER
  const supabase = createSupabaseServerClient()

  if (!env.TELNYX_API_KEY || !from) {
    await record("skipped", "SMS provider not configured")
    return { sent: false, error: "SMS provider not configured" }
  }

  try {
    const res = await fetch("https://api.telnyx.com/v2/messages", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.TELNYX_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: input.to, text: input.body }),
    })
    if (!res.ok) {
      const text = await res.text()
      await record("failed", text.slice(0, 500))
      return { sent: false, error: text }
    }
    await record("sent")
    return { sent: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : "SMS send failed"
    await record("failed", message)
    return { sent: false, error: message }
  }

  async function record(status: "sent" | "failed" | "skipped", error?: string) {
    const { error: dbError } = await supabase.from("sms_messages").insert({
      business_id: input.businessId,
      order_id: input.orderId ?? null,
      to_number: input.to,
      from_number: from ?? null,
      kind: input.kind,
      body: input.body,
      status,
      error: error ?? null,
    })
    if (dbError && !/relation .* does not exist/i.test(dbError.message)) {
      console.error("[sms] record failed:", dbError.message)
    }
  }
}
