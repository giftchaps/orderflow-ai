"use client"

import { TeamManager } from "@/components/portal/team-manager"
import { assignableRoles, type BusinessRole } from "@/lib/auth/permissions"
import type { StaffRecord } from "@/lib/business-shared"

export function StaffPanel({
  staff,
  role,
  currentUserId,
}: {
  staff: StaffRecord[]
  role: BusinessRole
  currentUserId: string | null
}) {
  return (
    <TeamManager
      staff={staff}
      apiBase="/api/business/staff"
      assignable={assignableRoles(role)}
      canManageOwner={role === "owner"}
      canManageRoles={role === "owner"}
      currentUserId={currentUserId}
    />
  )
}
