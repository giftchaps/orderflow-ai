import type { User } from "@supabase/supabase-js"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { normalizeEmail } from "@/lib/auth/normalize-email"

export type UserRole = {
  user_id: string | null
  business_id: string | null
  role: "owner" | "manager" | "staff"
  is_super_admin: boolean
  name: string | null
  email: string | null
}

type UserRoleRow = UserRole & {
  created_at: string | null
}

const roleSelect = "user_id, role, business_id, is_super_admin, name, email, created_at"

function pickPreferredRole(rows: UserRoleRow[]): UserRoleRow | null {
  if (rows.length === 0) return null

  const roleWeight: Record<UserRole["role"], number> = {
    owner: 3,
    manager: 2,
    staff: 1,
  }

  return [...rows].sort((a, b) => {
    if (a.is_super_admin !== b.is_super_admin) {
      return a.is_super_admin ? -1 : 1
    }

    if (roleWeight[a.role] !== roleWeight[b.role]) {
      return roleWeight[b.role] - roleWeight[a.role]
    }

    const aCreated = a.created_at ? Date.parse(a.created_at) : 0
    const bCreated = b.created_at ? Date.parse(b.created_at) : 0
    return bCreated - aCreated
  })[0]
}

export async function resolveUserRole(user: User): Promise<UserRole | null> {
  const admin = createSupabaseServerClient()
  const normalizedEmail = normalizeEmail(user.email)

  const { data: byUserIdRows, error: byUserIdError } = await admin
    .from("businesses_staff")
    .select(roleSelect)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (byUserIdError) {
    throw new Error(byUserIdError.message)
  }

  const byUserId = pickPreferredRole((byUserIdRows ?? []) as UserRoleRow[])

  if (byUserId) {
    if (normalizedEmail && byUserId.email !== normalizedEmail) {
      await admin
        .from("businesses_staff")
        .update({ email: normalizedEmail })
        .eq("user_id", user.id)
    }

    return byUserId as UserRole
  }

  if (!normalizedEmail) {
    return null
  }

  const { data: byEmailRows, error: byEmailError } = await admin
    .from("businesses_staff")
    .select(roleSelect)
    .ilike("email", normalizedEmail)
    .order("created_at", { ascending: false })

  if (byEmailError) {
    throw new Error(byEmailError.message)
  }

  const byEmail = pickPreferredRole((byEmailRows ?? []) as UserRoleRow[])

  if (!byEmail) {
    return null
  }

  const { error: linkError } = await admin
    .from("businesses_staff")
    .update({ user_id: user.id, email: normalizedEmail })
    .ilike("email", normalizedEmail)

  if (linkError) {
    throw new Error(linkError.message)
  }

  return {
    ...(byEmail as UserRole),
    user_id: user.id,
    email: normalizedEmail,
  }
}
