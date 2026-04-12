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

const roleSelect = "user_id, role, business_id, is_super_admin, name, email"

export async function resolveUserRole(user: User): Promise<UserRole | null> {
  const admin = createSupabaseServerClient()
  const normalizedEmail = normalizeEmail(user.email)

  const { data: byUserId, error: byUserIdError } = await admin
    .from("businesses_staff")
    .select(roleSelect)
    .eq("user_id", user.id)
    .maybeSingle()

  if (byUserIdError) {
    throw new Error(byUserIdError.message)
  }

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

  const { data: byEmail, error: byEmailError } = await admin
    .from("businesses_staff")
    .select(roleSelect)
    .ilike("email", normalizedEmail)
    .maybeSingle()

  if (byEmailError) {
    throw new Error(byEmailError.message)
  }

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
