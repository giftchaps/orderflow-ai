import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

/**
 * Edge proxy. Responsible ONLY for:
 *  1. Refreshing the Supabase auth cookie.
 *  2. Redirecting unauthenticated users away from protected areas.
 *
 * Role/tenant authorisation happens server-side in layouts and API guards
 * (lib/auth/guards.ts) because it needs database lookups.
 */
export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next()
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname, search } = request.nextUrl
  const isProtected = pathname.startsWith("/admin") || pathname.startsWith("/business") || pathname === "/no-access"

  if (!user && isProtected) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("next", `${pathname}${search}`)
    return NextResponse.redirect(loginUrl)
  }

  if (user && pathname === "/login") {
    // Already signed in: let the post-login router decide where to go.
    return NextResponse.redirect(new URL("/auth/continue", request.url))
  }

  return response
}

export const config = {
  matcher: ["/admin/:path*", "/business/:path*", "/login", "/no-access"],
}
