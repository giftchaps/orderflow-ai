import "server-only"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { getServerEnv } from "@/lib/env"

let cached: SupabaseClient | null = null

/**
 * Service-role Supabase client. Bypasses RLS.
 * ONLY use inside server code paths that have already authorised the caller
 * via `lib/auth/session.ts` (or a verified machine secret).
 */
export function createSupabaseServerClient(): SupabaseClient {
  if (cached) return cached
  const env = getServerEnv()
  cached = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return cached
}

/** @deprecated use createSupabaseServerClient */
export const createSupabaseServerClientFromEnv = createSupabaseServerClient
