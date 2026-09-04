import Link from "next/link"
import { Building2, ExternalLink } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { BusinessStatusBadge } from "@/components/portal/status-badge"
import { EmptyState } from "@/components/portal/empty-state"
import type { BusinessListRow } from "@/lib/platform-shared"
import { formatRelative } from "@/lib/platform-shared"
import { cn } from "@/lib/utils"

export function BusinessTable({ rows, compact }: { rows: BusinessListRow[]; compact?: boolean }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="No businesses"
        description="Onboard a restaurant to create its workspace, invite the owner and connect the phone agent."
        action={
          <Button asChild size="sm">
            <Link href="/admin/businesses/new">Onboard business</Link>
          </Button>
        }
      />
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Business</TableHead>
            <TableHead>Status</TableHead>
            {!compact && <TableHead className="hidden md:table-cell">Plan</TableHead>}
            <TableHead className="hidden lg:table-cell">Owner</TableHead>
            <TableHead className="hidden md:table-cell">Agent</TableHead>
            <TableHead className="text-right">Today</TableHead>
            <TableHead className="hidden sm:table-cell text-right">Active</TableHead>
            {!compact && <TableHead className="hidden xl:table-cell">Added</TableHead>}
            <TableHead className="w-[1%]">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((b) => (
            <TableRow key={b.id}>
              <TableCell>
                <Link href={`/admin/businesses/${b.slug ?? b.id}`} className="flex flex-col gap-0.5 hover:underline">
                  <span className="font-medium">{b.name}</span>
                  <span className="text-xs text-muted-foreground">/{b.slug ?? "—"}</span>
                </Link>
              </TableCell>
              <TableCell>
                <BusinessStatusBadge status={b.status} />
              </TableCell>
              {!compact && <TableCell className="hidden capitalize md:table-cell">{b.plan ?? "—"}</TableCell>}
              <TableCell className="hidden lg:table-cell">
                <span className="flex flex-col gap-0.5">
                  <span className="truncate text-sm">{b.owner_email ?? "—"}</span>
                  {b.owner_email && (
                    <span className={cn("text-xs", b.owner_activated ? "text-success" : "text-warning-foreground")}>
                      {b.owner_activated ? "Activated" : "Invite pending"}
                    </span>
                  )}
                </span>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <span className="flex flex-col gap-0.5 text-sm">
                  <span className={cn(!b.vapi_assistant_id && "text-muted-foreground")}>
                    {b.vapi_assistant_id ? "Connected" : "Not connected"}
                  </span>
                  <span className="text-xs text-muted-foreground">{b.phone_number ?? "No number"}</span>
                </span>
              </TableCell>
              <TableCell className="text-right tabular-nums">{b.orders_today}</TableCell>
              <TableCell className="hidden text-right tabular-nums sm:table-cell">
                <span className={cn(b.active_orders > 0 && "font-medium text-brand")}>{b.active_orders}</span>
              </TableCell>
              {!compact && (
                <TableCell className="hidden text-muted-foreground xl:table-cell">{formatRelative(b.created_at)}</TableCell>
              )}
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/admin/businesses/${b.slug ?? b.id}`}>Manage</Link>
                  </Button>
                  <Button asChild variant="ghost" size="icon-sm" title="Open business portal">
                    <a href={`/api/admin/view-business?business=${b.id}`}>
                      <ExternalLink className="size-4" />
                      <span className="sr-only">Open business portal</span>
                    </a>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
