import { createAuthClient } from "@/lib/supabase/auth-server"
import { resolveUserRole, type UserRole } from "@/lib/auth/resolve-user-role"

export async function getUserRole(): Promise<UserRole | null> {
  const supabase = await createAuthClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  return resolveUserRole(user)
}
