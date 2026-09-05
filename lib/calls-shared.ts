/**
 * Client-safe call-log types. This module must not import anything
 * server-only — the call log tables (business + admin) are client
 * components and import from here directly. The Supabase-backed read
 * helper lives in lib/calls.ts.
 */
export type CallLogRow = {
  id: string
  external_id: string | null
  caller_number: string | null
  transcript: string | null
  recording_url: string | null
  duration_seconds: number | null
  ended_reason: string | null
  summary: string | null
  order_id: string | null
  received_at: string
}

/** A handful of Vapi's documented endedReason values that mean "never actually connected." */
const MISSED_REASON_HINTS = ["did-not-answer", "voicemail", "busy", "no-answer"]

export function isMissedCall(row: Pick<CallLogRow, "ended_reason" | "transcript">) {
  const reason = row.ended_reason?.toLowerCase() ?? ""
  return !row.transcript && MISSED_REASON_HINTS.some((hint) => reason.includes(hint))
}

export function formatDuration(seconds: number | null) {
  if (!seconds || seconds < 1) return "—"
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}
