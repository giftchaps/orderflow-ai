"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, KeyRound, RotateCcw, Save, Send } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type Business = {
  id: string
  owner_email: string | null
  plan: string | null
  is_active: boolean | null
  display_pin: string | null
}

type StaffMember = {
  id: string
  email: string | null
  role: string | null
  user_id: string | null
  name: string | null
}

type SaveState = "idle" | "saving" | "saved" | "error"

interface Props {
  business: Business
  staff: StaffMember[]
}

export function BusinessOperationsPanel({ business, staff }: Props) {
  const router = useRouter()
  const [ownerEmail, setOwnerEmail] = useState(business.owner_email ?? "")
  const [plan, setPlan] = useState(business.plan ?? "starter")
  const [isActive, setIsActive] = useState(Boolean(business.is_active))
  const [pin, setPin] = useState("")
  const [status, setStatus] = useState<SaveState>("idle")
  const [inviteStatus, setInviteStatus] = useState<SaveState>("idle")
  const [pinStatus, setPinStatus] = useState<SaveState>("idle")
  const [message, setMessage] = useState<string | null>(null)

  const normalizedOwnerEmail = ownerEmail.trim().toLowerCase()
  const ownerStaff = useMemo(
    () => staff.find((member) => member.role === "owner" && member.email?.toLowerCase() === normalizedOwnerEmail),
    [normalizedOwnerEmail, staff]
  )

  const saveBusiness = async () => {
    setStatus("saving")
    setMessage(null)

    const res = await fetch(`/api/admin/businesses/${business.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner_email: ownerEmail,
        plan,
        is_active: isActive,
      }),
    })

    const data = await res.json()
    if (!res.ok || !data.ok) {
      setStatus("error")
      setMessage(data.error ?? "Unable to save business changes.")
      return
    }

    setStatus("saved")
    setMessage("Business settings saved.")
    router.refresh()
  }

  const resendInvite = async () => {
    setInviteStatus("saving")
    setMessage(null)

    const res = await fetch("/api/admin/resend-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: ownerEmail, business_id: business.id }),
    })

    const data = await res.json()
    if (!res.ok || !data.ok) {
      setInviteStatus("error")
      setMessage(data.error ?? "Unable to send invite.")
      return
    }

    setInviteStatus("saved")
    setMessage(data.warning ?? `Invite sent to ${ownerEmail}.`)
    router.refresh()
  }

  const updatePin = async (displayPin: string | null) => {
    setPinStatus("saving")
    setMessage(null)

    const res = await fetch(`/api/admin/businesses/${business.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display_pin: displayPin }),
    })

    const data = await res.json()
    if (!res.ok || !data.ok) {
      setPinStatus("error")
      setMessage(data.issues?.[0] ?? data.error ?? "Unable to update kitchen PIN.")
      return
    }

    setPin("")
    setPinStatus("saved")
    setMessage(displayPin ? "Kitchen PIN reset." : "Kitchen PIN removed.")
    router.refresh()
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]">
      <Card className="border-border">
        <CardHeader>
          <CardTitle>Access & Ownership</CardTitle>
          <CardDescription>Manage the owner account and staff access for this business.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
            <div className="space-y-2">
              <Label htmlFor="owner-email">Owner email</Label>
              <Input
                id="owner-email"
                type="email"
                value={ownerEmail}
                onChange={(event) => setOwnerEmail(event.target.value)}
                placeholder="owner@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Owner account</Label>
              <div className="flex h-9 items-center">
                {ownerStaff?.user_id ? (
                  <Badge className="bg-green-600 hover:bg-green-600">Activated</Badge>
                ) : (
                  <Badge variant="secondary">Invite Pending</Badge>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Plan</Label>
              <Select value={plan} onValueChange={setPlan}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="growth">Growth</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={isActive ? "active" : "inactive"} onValueChange={(value) => setIsActive(value === "active")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={saveBusiness} disabled={status === "saving" || !ownerEmail}>
              {status === "saving" ? (
                <RotateCcw className="mr-2 h-4 w-4 animate-spin" />
              ) : status === "saved" ? (
                <Check className="mr-2 h-4 w-4" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Business
            </Button>
            <Button variant="outline" onClick={resendInvite} disabled={inviteStatus === "saving" || !ownerEmail}>
              {inviteStatus === "saving" ? (
                <RotateCcw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send Owner Invite
            </Button>
          </div>

          {message && (
            <p className={`text-sm ${status === "error" || inviteStatus === "error" || pinStatus === "error" ? "text-destructive" : "text-muted-foreground"}`}>
              {message}
            </p>
          )}

          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Staff</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>{member.email ?? "-"}</TableCell>
                    <TableCell className="capitalize">{member.role ?? "staff"}</TableCell>
                    <TableCell>{member.user_id ? "Activated" : "Pending"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <CardTitle>Kitchen PIN</CardTitle>
          <CardDescription>Reset display access without needing the current PIN.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
            <span className="text-sm text-muted-foreground">Current state</span>
            {business.display_pin ? <Badge>PIN Set</Badge> : <Badge variant="secondary">Open Access</Badge>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="display-pin">New PIN</Label>
            <Input
              id="display-pin"
              inputMode="numeric"
              maxLength={8}
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
              placeholder="4-8 digits"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => updatePin(pin)} disabled={pinStatus === "saving" || pin.length < 4}>
              <KeyRound className="mr-2 h-4 w-4" />
              Reset PIN
            </Button>
            <Button variant="outline" onClick={() => updatePin(null)} disabled={pinStatus === "saving"}>
              Remove PIN
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
