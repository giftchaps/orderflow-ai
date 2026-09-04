import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { z } from "zod"
import { apiError, apiRequireSession, ApiError } from "@/lib/auth/guards"
import { ACTIVE_BUSINESS_COOKIE, ADMIN_VIEW_COOKIE } from "@/lib/auth/session"

const bodySchema = z.object({ businessId: z.string().uuid() })

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
}

/** Select which of the user's businesses is active for /business/* routes. */
export async function POST(request: Request) {
  try {
    const session = await apiRequireSession()
    const parsed = bodySchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw new ApiError(400, "businessId is required.")

    const membership = session.memberships.find((m) => m.businessId === parsed.data.businessId)
    if (!membership || membership.status !== "active") {
      throw new ApiError(403, "You are not an active member of that business.")
    }

    const store = await cookies()
    store.set(ACTIVE_BUSINESS_COOKIE, membership.businessId, COOKIE_OPTS)
    // Switching to one of your own businesses always ends an admin view session.
    store.delete(ADMIN_VIEW_COOKIE)

    return NextResponse.json({ ok: true, businessId: membership.businessId })
  } catch (error) {
    return apiError(error)
  }
}

/** Clear all business-context cookies (called on sign-out). */
export async function DELETE() {
  const store = await cookies()
  store.delete(ACTIVE_BUSINESS_COOKIE)
  store.delete(ADMIN_VIEW_COOKIE)
  return NextResponse.json({ ok: true })
}
