"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { UserPlus, Loader2 } from "lucide-react"

export default function StaffPage() {
  const [staff, setStaff] = useState<any[]>([])
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("staff")
  const [inviting, setInviting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: me } = await supabase.from("businesses_staff").select("business_id").eq("user_id", user.id).single()
      if (!me?.business_id) return
      setBusinessId(me.business_id)
      const { data } = await supabase.from("businesses_staff").select("*").eq("business_id", me.business_id)
      setStaff(data ?? [])
    }
    load()
  }, [])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!businessId) return
    setInviting(true)
    setMessage(null)

    const res = await fetch("/api/business/invite-staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole, business_id: businessId }),
    })
    const data = await res.json()

    if (res.ok) {
      setMessage(`Invite sent to ${inviteEmail}`)
      setInviteEmail("")
      // Refresh staff list
      const supabase = createClient()
      const { data: updated } = await supabase.from("businesses_staff").select("*").eq("business_id", businessId)
      setStaff(updated ?? [])
    } else {
      setMessage(data.message ?? "Failed to send invite")
    }
    setInviting(false)
  }

  const roleColors: Record<string, string> = {
    owner: "bg-[oklch(0.55_0.2_25)]/20 text-[oklch(0.55_0.2_25)]",
    manager: "bg-blue-500/20 text-blue-600",
    staff: "bg-secondary text-muted-foreground",
  }

  return (
    <div className="p-8 max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Staff</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your team</p>
      </div>

      {/* Staff List */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {staff.map((member) => (
              <div key={member.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="font-medium">{member.name ?? member.email ?? "Unnamed"}</p>
                  <p className="text-sm text-muted-foreground">{member.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${roleColors[member.role] ?? ""}`}>
                    {member.role}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {member.user_id ? "Active" : "Pending"}
                  </Badge>
                </div>
              </div>
            ))}
            {staff.length === 0 && (
              <p className="px-6 py-8 text-center text-muted-foreground text-sm">No staff members yet</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Invite */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle>Invite Staff</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="staff@example.com" required />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                >
                  <option value="manager">Manager</option>
                  <option value="staff">Staff</option>
                </select>
              </div>
            </div>
            {message && (
              <p className={`text-sm px-3 py-2 rounded-md ${message.includes("sent") ? "bg-green-500/10 text-green-600" : "bg-destructive/10 text-destructive"}`}>
                {message}
              </p>
            )}
            <Button type="submit" disabled={inviting}>
              {inviting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
              Send Invite
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
