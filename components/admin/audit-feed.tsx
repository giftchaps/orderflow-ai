import { History } from "lucide-react"
import { EmptyState } from "@/components/portal/empty-state"
import type { AuditRow } from "@/lib/platform"
import { formatRelative } from "@/lib/platform"

const ACTION_LABEL: Record<string, string> = {
  "business.created": "created a business",
  "business.updated": "updated business settings",
  "business.status_changed": "changed business status",
  "business.owner_changed": "changed the business owner",
  "business.agent_updated": "updated the phone agent",
  "business.pin_changed": "changed the display PIN",
  "menu.saved": "saved the menu",
  "menu.published": "published the menu",
  "staff.invited": "invited a team member",
  "staff.invite_resent": "re-sent an invite",
  "staff.role_changed": "changed a team member's role",
  "staff.removed": "removed a team member",
  "platform_admin.added": "added a platform admin",
  "platform_admin.removed": "removed a platform admin",
  "order.status_changed": "changed an order status",
  "order.created": "created an order",
}

export function AuditFeed({ rows, showBusiness }: { rows: AuditRow[]; showBusiness?: boolean }) {
  if (rows.length === 0) {
    return <EmptyState icon={History} title="No activity yet" description="Administrative actions will appear here." />
  }

  return (
    <ol className="flex flex-col divide-y rounded-xl border bg-card">
      {rows.map((row) => {
        const meta = (row.metadata ?? {}) as Record<string, unknown>
        const detail =
          typeof meta.to === "string"
            ? `→ ${meta.to}`
            : typeof meta.email === "string"
              ? meta.email
              : typeof meta.businessName === "string"
                ? meta.businessName
                : null
        return (
          <li key={row.id} className="flex flex-col gap-1 px-4 py-3 text-sm">
            <p className="text-pretty">
              <span className="font-medium">{row.actor_email ?? labelActor(row.actor_type)}</span>{" "}
              <span className="text-muted-foreground">{ACTION_LABEL[row.action] ?? row.action}</span>
              {detail && <span className="text-muted-foreground"> · {detail}</span>}
            </p>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <time dateTime={row.created_at}>{formatRelative(row.created_at)}</time>
              {showBusiness && typeof meta.businessName === "string" && <span>· {meta.businessName}</span>}
            </p>
          </li>
        )
      })}
    </ol>
  )
}

function labelActor(type: string) {
  switch (type) {
    case "platform_admin":
      return "Platform admin"
    case "display":
      return "Kitchen display"
    case "system":
      return "System"
    default:
      return "Someone"
  }
}
