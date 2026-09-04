"use client"

import { DisplaySettings } from "@/components/portal/display-settings"
import type { AdminBusiness } from "./tabs"

export function DisplayPanel({ business, displayUrl }: { business: AdminBusiness; displayUrl: string }) {
  return <DisplaySettings displayUrl={displayUrl} hasPin={business.hasPin} apiPath={`/api/admin/businesses/${business.id}`} />
}
