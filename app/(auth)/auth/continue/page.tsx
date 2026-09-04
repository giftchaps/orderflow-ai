import { redirect } from "next/navigation"
import { defaultLandingPath, getSession } from "@/lib/auth/session"

/**
 * Post-login router. Decides where a signed-in user should land based on
 * their platform-admin flag and business memberships. Accepts ?next= for
 * deep links, but only honours it when the user is allowed to go there.
 */
export default async function AuthContinuePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  const session = await getSession()
  if (!session) redirect("/login")

  const landing = defaultLandingPath(session)

  if (next && next.startsWith("/") && !next.startsWith("//")) {
    const wantsAdmin = next.startsWith("/admin")
    const wantsBusiness = next.startsWith("/business")
    if (wantsAdmin && session.isPlatformAdmin) redirect(next)
    if (wantsBusiness && (session.activeMembership || session.isPlatformAdmin)) redirect(next)
  }

  redirect(landing)
}
