"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, ShieldCheck, ShieldPlus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
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
import { EmptyState } from "@/components/portal/empty-state"
import { api } from "@/lib/api-client"
import type { PlatformAdminRow } from "@/lib/platform-shared"

export function AdminsManager({ admins, currentUserId }: { admins: PlatformAdminRow[]; currentUserId: string | null }) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ email: "", name: "" })
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<PlatformAdminRow | null>(null)

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdding(true)
    try {
      const res = await api<{ emailSent: boolean; linkedExisting: boolean }>("/api/admin/admins", {
        body: { email: form.email.trim(), name: form.name.trim() || undefined },
      })
      if (res.linkedExisting) toast.success(`${form.email.trim()} is now a platform admin`)
      else if (res.emailSent) toast.success(`Invite sent to ${form.email.trim()}`)
      else toast.warning(`Added ${form.email.trim()}, but the invite email could not be sent`)
      setForm({ email: "", name: "" })
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add admin")
    } finally {
      setAdding(false)
    }
  }

  const remove = async (admin: PlatformAdminRow) => {
    setPendingId(admin.id)
    try {
      await api(`/api/admin/admins/${admin.id}`, { method: "DELETE" })
      toast.success(`${admin.email} removed`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove admin")
    } finally {
      setPendingId(null)
    }
  }

  const lastAdmin = admins.length <= 1

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <Card className="overflow-hidden p-0 shadow-none">
        {admins.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="No platform admins" description="This shouldn't happen — add one below." className="m-5" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Admin</TableHead>
                <TableHead className="hidden sm:table-cell">Status</TableHead>
                <TableHead className="w-[1%]">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((admin) => {
                const isSelf = Boolean(currentUserId && admin.user_id === currentUserId)
                const busy = pendingId === admin.id
                return (
                  <TableRow key={admin.id}>
                    <TableCell>
                      <span className="flex flex-col gap-0.5">
                        <span className="font-medium">
                          {admin.name || admin.email}
                          {isSelf && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                        </span>
                        {admin.name && <span className="text-xs text-muted-foreground">{admin.email}</span>}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant={admin.user_id ? "secondary" : "outline"} className="capitalize">
                        {admin.user_id ? "Active" : "Invite pending"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title={isSelf ? "You cannot remove yourself" : lastAdmin ? "At least one admin is required" : "Remove"}
                        disabled={busy || isSelf || lastAdmin}
                        onClick={() => setConfirmRemove(admin)}
                      >
                        {busy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                        <span className="sr-only">Remove {admin.email}</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <Card className="p-5 shadow-none">
        <form onSubmit={add} className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <ShieldPlus className="size-4 text-muted-foreground" />
            <p className="font-medium">Add a platform admin</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="admin-email">Email</Label>
            <Input
              id="admin-email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="name@orderflow.ai"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="admin-name">Name (optional)</Label>
            <Input id="admin-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <p className="text-xs text-muted-foreground">
            If they don&apos;t have an account yet, we&apos;ll send an invite email. Platform admins can manage every business.
          </p>
          <Button type="submit" disabled={adding}>
            {adding && <Loader2 className="size-4 animate-spin" />}
            Add admin
          </Button>
        </form>
      </Card>

      <AlertDialog open={Boolean(confirmRemove)} onOpenChange={(o) => !o && setConfirmRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {confirmRemove?.name || confirmRemove?.email}?</AlertDialogTitle>
            <AlertDialogDescription>
              They will immediately lose platform-admin access. This does not delete their account or any business membership they have.
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
