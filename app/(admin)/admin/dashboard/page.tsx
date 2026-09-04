import { redirect } from "next/navigation"

/** Legacy path kept for bookmarks. The overview now lives at /admin. */
export default function LegacyAdminDashboard() {
  redirect("/admin")
}
