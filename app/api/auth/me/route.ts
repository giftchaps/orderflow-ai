import { NextRequest, NextResponse } from "next/server"
import { createAuthClient } from "@/lib/supabase/auth-server"
import { buildSession, defaultLandingPath } from "@/lib/auth/session"
import { toPortalUser } from "@/lib/auth/portal-user"

/**
 * GET /api/auth/me
 * Returns the caller's platform identity: platform-admin flag, business
 * memberships (with roles), the active business, and where they should land.
 * Accepts either the Supabase cookie session or a `Authorization: Bearer` token
 * (used right after sign-in before cookies have propagated).
 */
export async function GET(request: NextRequest) {
  try {
    const authClient = await createAuthClient()
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : undefined

    const {
      data: { user },
    } = token ? await authClient.auth.getUser(token) : await authClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 })
    }

    const session = await buildSession(user)
    const portalUser = toPortalUser(session)

    if (!session.isPlatformAdmin && session.memberships.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "This account is not linked to any business. Ask your administrator to invite this email address.",
          user: portalUser,
          landing: "/no-access",
        },
        { status: 403 }
      )
    }

    return NextResponse.json({ ok: true, user: portalUser, landing: defaultLandingPath(session) })
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unable to load account." },
      { status: 500 }
    )
  }
}
