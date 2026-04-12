import { redirect } from "next/navigation"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { Sidebar } from "@/components/portal/sidebar"

export default async function BusinessLayout({ children }: { children: React.ReactNode }) {
  const role = await getUserRole()

  if (!role) redirect("/login")
  if (role.is_super_admin) redirect("/admin/dashboard")

  if (!role.business_id) redirect("/login")

  const supabase = createSupabaseServerClient()
  const { data: business } = await supabase
    .from("businesses")
    .select("name, slug")
    .eq("id", role.business_id)
    .single()

  const kitchenDisplayUrl = business?.slug
    ? `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/display/${business.slug}`
    : undefined

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        variant="business"
        businessName={business?.name}
        kitchenDisplayUrl={kitchenDisplayUrl}
      />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
