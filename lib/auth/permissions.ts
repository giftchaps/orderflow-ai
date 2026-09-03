/**
 * Role & permission model for business tenants.
 *
 * Roles are strictly ordered: staff < manager < owner.
 * Platform admins are NOT a business role; they are a separate identity
 * (see lib/auth/session.ts) and are treated as `owner` when viewing a business.
 */
export type BusinessRole = "owner" | "manager" | "staff"

export const BUSINESS_ROLES: BusinessRole[] = ["owner", "manager", "staff"]

const ROLE_RANK: Record<BusinessRole, number> = { staff: 1, manager: 2, owner: 3 }

export type Permission =
  | "orders.view"
  | "orders.update"
  | "menu.view"
  | "menu.edit"
  | "menu.publish"
  | "staff.view"
  | "staff.invite"
  | "staff.manage_roles"
  | "staff.remove"
  | "settings.view"
  | "settings.edit"
  | "display.manage_pin"
  | "analytics.view"

/** Minimum role required for each permission. */
export const PERMISSION_MIN_ROLE: Record<Permission, BusinessRole> = {
  "orders.view": "staff",
  "orders.update": "staff",
  "menu.view": "staff",
  "menu.edit": "manager",
  "menu.publish": "manager",
  "staff.view": "manager",
  "staff.invite": "manager",
  "staff.manage_roles": "owner",
  "staff.remove": "owner",
  "settings.view": "manager",
  "settings.edit": "owner",
  "display.manage_pin": "manager",
  "analytics.view": "manager",
}

export function roleAtLeast(role: BusinessRole, min: BusinessRole) {
  return ROLE_RANK[role] >= ROLE_RANK[min]
}

export function can(role: BusinessRole | null | undefined, permission: Permission) {
  if (!role) return false
  return roleAtLeast(role, PERMISSION_MIN_ROLE[permission])
}

/** Which roles a given actor may assign to others. Owners can assign anything; managers only staff. */
export function assignableRoles(actorRole: BusinessRole): BusinessRole[] {
  if (actorRole === "owner") return ["owner", "manager", "staff"]
  if (actorRole === "manager") return ["staff"]
  return []
}

export function isBusinessRole(value: unknown): value is BusinessRole {
  return typeof value === "string" && (BUSINESS_ROLES as string[]).includes(value)
}

export const ROLE_LABEL: Record<BusinessRole, string> = {
  owner: "Owner",
  manager: "Manager",
  staff: "Staff",
}

export const ROLE_DESCRIPTION: Record<BusinessRole, string> = {
  owner: "Full control: settings, billing, team roles, menu and orders.",
  manager: "Runs the location: menu, staff invites, kitchen PIN, analytics.",
  staff: "Works orders on the kitchen display and order list.",
}
