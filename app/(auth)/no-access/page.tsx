import { redirect } from "next/navigation"
import { getSession, defaultLandingPath } from "@/lib/auth/session"
import { AuthFrame } from "@/components/auth/auth-frame"
import { SignOutButton } from "@/components/auth/sign-out-button"

export default async function NoAccessPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const landing = defaultLandingPath(session)
  if (landing !== "/no-access") redirect(landing)

  return (
    <AuthFrame
      title="No workspace yet"
      description={`${session.user.email ?? "This account"} is signed in but isn't linked to any business.`}
    >
      <div className="flex flex-col gap-4 text-sm text-muted-foreground">
        <p className="text-pretty">
          Access to OrderFlow is by invitation. Ask your restaurant owner to invite this email address from{" "}
          <span className="font-medium text-foreground">Team → Invite</span>, or contact the OrderFlow team if you are
          expecting a new business to be set up for you.
        </p>
        <SignOutButton />
      </div>
    </AuthFrame>
  )
}
