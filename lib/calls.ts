import "server-only"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import type { CallLogRow } from "@/lib/calls-shared"

export type { CallLogRow }
export { isMissedCall, formatDuration } from "@/lib/calls-shared"

const CALL_SELECT =
  "id, external_id, caller_number, transcript, recording_url, duration_seconds, ended_reason, summary, order_id, received_at"

/**
 * Every call Vapi has reported for a business — not just ones that became
 * an order. Backed by webhook_events (provider='vapi', event_type=
 * 'end-of-call-report'), written to by backend/main.py on every call.
 */
export async function fetchCalls(businessId: string, opts?: { q?: string; limit?: number }): Promise<CallLogRow[]> {
  const supabase = createSupabaseServerClient()
  let query = supabase
    .from("webhook_events")
    .select(CALL_SELECT)
    .eq("business_id", businessId)
    .eq("provider", "vapi")
    .eq("event_type", "end-of-call-report")
    .order("received_at", { ascending: false })
    .limit(opts?.limit ?? 200)

  const q = opts?.q?.trim().replace(/[%,]/g, "")
  if (q) {
    query = query.or(`caller_number.ilike.%${q}%,transcript.ilike.%${q}%,summary.ilike.%${q}%`)
  }

  const { data, error } = await query
  if (error) {
    // Tolerates a DB that hasn't run the call-log migration yet — an empty
    // call log is a much better failure mode than a broken page.
    console.error("[calls] failed to load call log:", error.message)
    return []
  }
  return (data ?? []) as CallLogRow[]
}
