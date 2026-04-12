import { redirect } from "next/navigation"
import { getUserRole } from "@/lib/auth/get-user-role"
import { Sidebar } from "@/components/portal/sidebar"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const role = await getUserRole()

  if (!role || !role.is_super_admin) {
    redirect("/login")
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar variant="admin" />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
