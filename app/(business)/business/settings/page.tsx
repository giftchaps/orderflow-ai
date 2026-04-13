import { redirect } from "next/navigation"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { SettingsForm } from "./settings-form"

export default async function SettingsPage() {
  const role = await getUserRole()
  if (!role?.business_id) redirect("/login")

  const supabase = createSupabaseServerClient()
  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, slug, address, prep_time_minutes, phone_number, vapi_assistant_id")
    .eq("id", role.business_id)
    .single()

  if (!business) redirect("/login")

  const kitchenUrl = business.slug
    ? `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/display/${business.slug}`
    : ""

  return <SettingsForm business={business} kitchenUrl={kitchenUrl} />
}
