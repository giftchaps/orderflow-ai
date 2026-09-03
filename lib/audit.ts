import "server-only"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import type { Session } from "@/lib/auth/session"

export type AuditAction =
  | "business.created"
  | "business.updated"
  | "business.status_changed"
  | "business.owner_changed"
  | "business.agent_updated"
  | "business.pin_changed"
  | "menu.saved"
  | "menu.published"
  | "staff.invited"
  | "staff.invite_resent"
  | "staff.role_changed"
  | "staff.removed"
  | "platform_admin.added"
  | "platform_admin.removed"
  | "order.status_changed"
  | "order.created"

type AuditInput = {
  action: AuditAction
  session?: Session | null
  actorType?: "user" | "platform_admin" | "display" | "system"
  businessId?: string | null
  targetType?: string
  targetId?: string
  metadata?: Record<string, unknown>
}

/**
 * Append an audit log row. Never throws — audit failures must not block the
 * user action, but they are logged so they show up in Vercel logs.
 */
export async function logAudit(input: AuditInput) {
  try {
    const supabase = createSupabaseServerClient()
    const actorType =
      input.actorType ?? (input.session ? (input.session.isPlatformAdmin ? "platform_admin" : "user") : "system")

    const { error } = await supabase.from("audit_logs").insert({
      action: input.action,
      actor_type: actorType,
      actor_user_id: input.session?.user.id ?? null,
      actor_email: input.session?.user.email ?? null,
      business_id: input.businessId ?? null,
      target_type: input.targetType ?? null,
      target_id: input.targetId ?? null,
      metadata: input.metadata ?? {},
    })

    if (error) console.error("[audit] insert failed:", error.message)
  } catch (error) {
    console.error("[audit] unexpected:", error)
  }
}
