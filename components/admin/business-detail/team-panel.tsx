"use client"

import { TeamManager } from "@/components/portal/team-manager"
import type { StaffRecord } from "@/lib/business-shared"
import type { AdminBusiness } from "./tabs"

export function TeamPanel({ business, staff }: { business: AdminBusiness; staff: StaffRecord[] }) {
  return (
    <TeamManager
      staff={staff}
      apiBase={`/api/admin/businesses/${business.id}/staff`}
      assignable={["owner", "manager", "staff"]}
      canManageOwner
    />
  )
}
