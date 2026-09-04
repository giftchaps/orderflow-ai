import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { BusinessStatus, MembershipStatus } from "@/lib/auth/session"
import type { OrderStatus } from "@/lib/orders"
import { STATUS_LABEL } from "@/lib/orders"

const BUSINESS_STATUS: Record<BusinessStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-secondary text-secondary-foreground" },
  invited: { label: "Invited", className: "bg-status-pending-bg text-warning-foreground" },
  active: { label: "Live", className: "bg-status-ready-bg text-success" },
  suspended: { label: "Suspended", className: "bg-status-making-bg text-destructive" },
}

export function BusinessStatusBadge({ status, compact }: { status: BusinessStatus; compact?: boolean }) {
  const s = BUSINESS_STATUS[status]
  return (
    <Badge variant="outline" className={cn("gap-1.5 border-transparent font-medium", s.className, compact && "px-1.5 py-0 text-[10px]")}>
      <span
        className={cn(
          "size-1.5 rounded-full",
          status === "active" && "bg-success",
          status === "invited" && "bg-warning",
          status === "suspended" && "bg-destructive",
          status === "draft" && "bg-muted-foreground"
        )}
        aria-hidden
      />
      {s.label}
    </Badge>
  )
}

const MEMBERSHIP_STATUS: Record<MembershipStatus, { label: string; className: string }> = {
  invited: { label: "Invite pending", className: "bg-status-pending-bg text-warning-foreground" },
  active: { label: "Active", className: "bg-status-ready-bg text-success" },
  disabled: { label: "Disabled", className: "bg-secondary text-muted-foreground" },
}

export function MembershipStatusBadge({ status }: { status: MembershipStatus }) {
  const s = MEMBERSHIP_STATUS[status]
  return (
    <Badge variant="outline" className={cn("border-transparent font-medium", s.className)}>
      {s.label}
    </Badge>
  )
}

const ORDER_STATUS: Record<OrderStatus, string> = {
  pending: "bg-status-pending-bg text-warning-foreground",
  making: "bg-status-making-bg text-destructive",
  ready: "bg-status-ready-bg text-success",
  done: "bg-secondary text-muted-foreground",
  cancelled: "bg-secondary text-muted-foreground line-through",
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge variant="outline" className={cn("border-transparent font-medium", ORDER_STATUS[status])}>
      {STATUS_LABEL[status]}
    </Badge>
  )
}
