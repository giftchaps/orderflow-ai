import { createAuthClient } from "@/lib/supabase/auth-server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export type UserRole = {
  user_id: string
  business_id: string | null
  role: "owner" | "manager" | "staff"
  is_super_admin: boolean
  name: string | null
  email: string | null
}

export async function getUserRole(): Promise<UserRole | null> {
  const supabase = await createAuthClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const admin = createSupabaseServerClient()
  const { data: staff } = await admin
    .from("businesses_staff")
    .select("user_id, role, business_id, is_super_admin, name, email")
    .eq("user_id", user.id)
    .single()

  if (!staff) return null

  return staff as UserRole
}
