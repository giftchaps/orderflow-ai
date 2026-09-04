import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { apiError, apiRequirePlatformAdmin, ApiError } from "@/lib/auth/guards"
import { ADMIN_VIEW_COOKIE } from "@/lib/auth/session"
import { fetchBusiness } from "@/lib/business"
import { getAppUrl } from "@/lib/env"

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 8,
}

/**
 * GET /api/admin/view-business?business=<id|slug>  -> opens /business as that tenant
 * GET /api/admin/view-business?exit=1              -> clears the admin view and returns to /admin
 *
 * Implemented as a GET redirect so it can be a plain link in the admin UI.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const base = getAppUrl(url.origin)

  try {
    await apiRequirePlatformAdmin()
    const store = await cookies()

    if (url.searchParams.get("exit")) {
      store.delete(ADMIN_VIEW_COOKIE)
      const back = url.searchParams.get("to") ?? "/admin/businesses"
      return NextResponse.redirect(new URL(back, base))
    }

    const ref = url.searchParams.get("business")
    if (!ref) throw new ApiError(400, "business is required.")

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ref)
    const business = await fetchBusiness(isUuid ? { id: ref } : { slug: ref })
    if (!business) throw new ApiError(404, "Business not found.")

    store.set(ADMIN_VIEW_COOKIE, business.id, COOKIE_OPTS)
    const to = url.searchParams.get("to") ?? "/business"
    return NextResponse.redirect(new URL(to.startsWith("/business") ? to : "/business", base))
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return NextResponse.redirect(new URL("/login?next=/admin", base))
    }
    return apiError(error)
  }
}
