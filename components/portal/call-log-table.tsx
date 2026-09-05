"use client"

import { Fragment, useMemo, useState } from "react"
import { ChevronDown, ChevronUp, PhoneMissed, Search } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmptyState } from "@/components/portal/empty-state"
import { isMissedCall, formatDuration, type CallLogRow } from "@/lib/calls-shared"

/**
 * Every call a business's Vapi assistant has reported — not just ones that
 * became an order. Shared by the business portal and the admin business
 * detail page (same component, same data shape), same pattern as
 * team-manager.tsx in this directory.
 */
export function CallLogTable({ calls }: { calls: CallLogRow[] }) {
  const [q, setQ] = useState("")
  const [expanded, setExpanded] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return calls
    return calls.filter((c) =>
      [c.caller_number, c.transcript, c.summary].some((f) => f?.toLowerCase().includes(needle))
    )
  }, [calls, q])

  if (calls.length === 0) {
    return (
      <EmptyState
        icon={PhoneMissed}
        title="No calls yet"
        description="Every call your phone agent handles — whether or not it became an order — will show up here, with a recording, transcript and short summary."
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by phone number, transcript or summary…"
          className="pl-8"
        />
      </div>

      <Card className="overflow-hidden p-0 shadow-none">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>When</TableHead>
              <TableHead>Caller</TableHead>
              <TableHead className="hidden sm:table-cell">Duration</TableHead>
              <TableHead>Outcome</TableHead>
              <TableHead className="w-[1%]">
                <span className="sr-only">Expand</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((call) => {
              const missed = isMissedCall(call)
              const isOpen = expanded === call.id
              return (
                <Fragment key={call.id}>
                  <TableRow
                    className="cursor-pointer"
                    onClick={() => setExpanded(isOpen ? null : call.id)}
                  >
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {new Date(call.received_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-medium">{call.caller_number ?? "Unknown"}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {formatDuration(call.duration_seconds)}
                    </TableCell>
                    <TableCell>
                      {missed ? (
                        <Badge variant="outline" className="border-transparent bg-status-pending-bg font-medium text-warning-foreground">
                          Missed — texted back
                        </Badge>
                      ) : call.order_id ? (
                        <Badge variant="outline" className="border-transparent bg-status-ready-bg font-medium text-success">
                          Order placed
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-transparent bg-secondary font-medium text-muted-foreground">
                          No order
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {isOpen ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
                    </TableCell>
                  </TableRow>
                  {isOpen && (
                    <TableRow key={`${call.id}-detail`} className="hover:bg-transparent">
                      <TableCell colSpan={5} className="bg-secondary/30">
                        <div className="flex flex-col gap-3 py-2">
                          {call.summary && (
                            <p className="text-sm">
                              <span className="font-medium">Summary: </span>
                              {call.summary}
                            </p>
                          )}
                          {call.recording_url && (
                            // eslint-disable-next-line jsx-a11y/media-has-caption
                            <audio controls src={call.recording_url} className="h-9 w-full max-w-md" />
                          )}
                          {call.transcript ? (
                            <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-md bg-card p-3 text-xs text-muted-foreground">
                              {call.transcript}
                            </pre>
                          ) : (
                            <p className="text-xs text-muted-foreground">No transcript — the call ended before any conversation was captured.</p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              )
            })}
          </TableBody>
        </Table>
      </Card>

      {filtered.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">No calls match “{q}”.</p>
      )}
    </div>
  )
}
