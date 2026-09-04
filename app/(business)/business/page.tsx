import { redirect } from "next/navigation"

/** `/business` is the landing path used by sign-in, the sidebar and the business
 *  switcher (see lib/auth/session.ts defaultLandingPath). The actual overview
 *  lives at /business/dashboard. */
export default function BusinessIndexPage() {
  redirect("/business/dashboard")
}
