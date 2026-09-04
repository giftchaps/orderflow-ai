"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, MailPlus, MoreHorizontal, RefreshCw, ShieldOff, Trash2, UserCheck, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { MembershipStatusBadge } from "@/components/portal/status-badge"
import { EmptyState } from "@/components/portal/empty-state"
import { api } from "@/lib/api-client"
import { ROLE_DESCRIPTION, ROLE_LABEL, type BusinessRole } from "@/lib/auth/permissions"
import type { StaffRecord } from "@/lib/business"
import type { MembershipStatus } from "@/lib/auth/session"

type Props = {
  staff: StaffRecord[]
  /** e.g. `/api/admin/businesses/<id>/staff` or `/api/business/staff` */
  apiBase: string
  /** Roles the current actor may assign. */
  assignable: BusinessRole[]
  /** True for platform admins — unlocks owner management. */
  canManageOwner: boolean
  currentUserId?: string | null
}

export function TeamManager({ staff, apiBase, assignable, canManageOwner, currentUserId }: Props) {
  const router = useRouter()
  const [inviting, setInviting] = useState(false)
  const [form, setForm] = useState<{ email: string; name: string; role: BusinessRole }>({
    email: "",
    name: "",
    role: assignable.includes("staff") ? "staff" : assignable[0],
  })
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<StaffRecord | null>(null)

  const invite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviting(true)
    try {
      const res = await api<{ emailSent: boolean; warning?: string }>(apiBase, {
        body: { email: form.email.trim(), name: form.name.trim() || undefined, role: form.role },
      })
      if (res.warning) toast.warning(res.warning)
      else toast.success(`Invite sent to ${form.email.trim()}`)
      setForm({ ...form, email: "", name: "" })
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send invite")
    } finally {
      setInviting(false)
    }
  }

  const run = async (member: StaffRecord, fn: () => Promise<unknown>, success: string) => {
    setPendingId(member.id)
    try {
      await fn()
      toast.success(success)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed")
    } finally {
      setPendingId(null)
    }
  }

  const resend = (m: StaffRecord) =>
    run(m, () => api(`${apiBase}/${m.id}`, { method: "POST" }), `Invite re-sent to ${m.email}`)
  const setRole = (m: StaffRecord, role: BusinessRole) =>
    run(m, () => api(`${apiBase}/${m.id}`, { method: "PATCH", body: { role } }), `Role changed to ${ROLE_LABEL[role]}`)
  const setStatus = (m: StaffRecord, status: "active" | "disabled") =>
    run(m, () => api(`${apiBase}/${m.id}`, { method: "PATCH", body: { status } }), status === "disabled" ? "Access disabled" : "Access restored")
  const remove = (m: StaffRecord) =>
    run(m, () => api(`${apiBase}/${m.id}`, { method: "DELETE" }), `${m.email} removed`)

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <Card className="overflow-hidden p-0 shadow-none">
        {staff.length === 0 ? (
          <EmptyState icon={Users} title="No team members yet" description="Invite the owner first, then managers and kitchen staff." className="m-5" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden sm:table-cell">Status</TableHead>
                <TableHead className="w-[1%]">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((m) => {
                const status = membershipStatus(m)
                const isSelf = Boolean(currentUserId && m.user_id === currentUserId)
                const isOwner = m.role === "owner"
                const locked = isOwner && !canManageOwner
                const busy = pendingId === m.id
                return (
                  <TableRow key={m.id}>
                    <TableCell>
                      <span className="flex flex-col gap-0.5">
                        <span className="font-medium">
                          {m.name || m.email}
                          {isSelf && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                        </span>
                        {m.name && <span className="text-xs text-muted-foreground">{m.email}</span>}
                      </span>
                    </TableCell>
                    <TableCell>{ROLE_LABEL[m.role as BusinessRole] ?? m.role}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <MembershipStatusBadge status={status} />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" disabled={busy || (locked && !canManageOwner && isSelf)}>
                            {busy ? <Loader2 className="size-4 animate-spin" /> : <MoreHorizontal className="size-4" />}
                            <span className="sr-only">Actions for {m.email}</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          {status === "invited" && (
                            <DropdownMenuItem onSelect={() => resend(m)}>
                              <RefreshCw className="size-4" /> Resend invite
                            </DropdownMenuItem>
                          )}
                          {!locked && !isSelf && (
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>Change role</DropdownMenuSubTrigger>
                              <DropdownMenuSubContent>
                                <DropdownMenuLabel className="text-xs">Assign role</DropdownMenuLabel>
                                {(canManageOwner ? (["owner", "manager", "staff"] as BusinessRole[]) : assignable).map((r) => (
                                  <DropdownMenuItem key={r} disabled={r === m.role} onSelect={() => setRole(m, r)}>
                                    {ROLE_LABEL[r]}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                          )}
                          {!locked && !isSelf && status !== "invited" && (
                            <DropdownMenuItem onSelect={() => setStatus(m, status === "disabled" ? "active" : "disabled")}>
                              {status === "disabled" ? <UserCheck className="size-4" /> : <ShieldOff className="size-4" />}
                              {status === "disabled" ? "Restore access" : "Disable access"}
                            </DropdownMenuItem>
                          )}
                          {!locked && !isSelf && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem variant="destructive" onSelect={() => setConfirmRemove(m)}>
                                <Trash2 className="size-4" /> Remove
                              </DropdownMenuItem>
                            </>
                          )}
                          {(locked || isSelf) && status !== "invited" && (
                            <DropdownMenuItem disabled>{isSelf ? "You cannot edit yourself" : "Owner is platform-managed"}</DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <Card className="p-5 shadow-none">
        <form onSubmit={invite} className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <MailPlus className="size-4 text-muted-foreground" />
            <p className="font-medium">Invite a team member</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="name@restaurant.com"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-name">Name (optional)</Label>
            <Input id="invite-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-role">Role</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as BusinessRole })}>
              <SelectTrigger id="invite-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {assignable.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTION[form.role]}</p>
          </div>
          <Button type="submit" disabled={inviting}>
            {inviting && <Loader2 className="size-4 animate-spin" />}
            Send invite
          </Button>
        </form>
      </Card>

      <AlertDialog open={Boolean(confirmRemove)} onOpenChange={(o) => !o && setConfirmRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {confirmRemove?.name || confirmRemove?.email}?</AlertDialogTitle>
            <AlertDialogDescription>
              They will immediately lose access to this business. Their account is not deleted; you can invite them again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmRemove) remove(confirmRemove)
                setConfirmRemove(null)
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function membershipStatus(m: StaffRecord): MembershipStatus {
  if (m.status === "disabled") return "disabled"
  if (m.status === "active" || m.user_id) return "active"
  return "invited"
}
