import "server-only"

import { z } from "zod"

/**
 * Server environment.
 *
 * Only Supabase credentials are required for the platform to function.
 * Everything else is optional and feature-gated:
 *  - ORDERFLOW_INGEST_SECRET: shared secret the FastAPI backend sends on POST /api/orders
 *  - KDS_TOKEN_SECRET: signs kitchen display tokens (falls back to service role key)
 *  - OPENAI_API_KEY: menu extraction
 *  - VAPI_API_KEY: pushes regenerated prompts to Vapi assistants
 *  - TELNYX_*: outbound SMS
 *  - ORDERFLOW_BUSINESS_ID: LEGACY single-tenant fallback. Do not rely on it.
 */
const serverEnvSchema = z.object({
  SUPABASE_URL: z.string().url("SUPABASE_URL must be a valid URL"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
  ORDERFLOW_INGEST_SECRET: z.string().min(16).optional(),
  KDS_TOKEN_SECRET: z.string().min(16).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  VAPI_API_KEY: z.string().min(1).optional(),
  TELNYX_API_KEY: z.string().min(1).optional(),
  TELNYX_FROM_NUMBER: z.string().min(1).optional(),
  BACKEND_URL: z.string().url().optional(),
  ORDERFLOW_BUSINESS_ID: z.string().uuid().optional(),
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
})

export type ServerEnv = z.infer<typeof serverEnvSchema>

function readRaw() {
  const legacyBusinessId = process.env.ORDERFLOW_BUSINESS_ID?.trim()
  return {
    SUPABASE_URL: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ORDERFLOW_INGEST_SECRET: process.env.ORDERFLOW_INGEST_SECRET || undefined,
    KDS_TOKEN_SECRET: process.env.KDS_TOKEN_SECRET || undefined,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || undefined,
    VAPI_API_KEY: process.env.VAPI_API_KEY || undefined,
    TELNYX_API_KEY: process.env.TELNYX_API_KEY || undefined,
    TELNYX_FROM_NUMBER: process.env.TELNYX_FROM_NUMBER || undefined,
    BACKEND_URL: process.env.BACKEND_URL || undefined,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || undefined,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || undefined,
    ORDERFLOW_BUSINESS_ID: legacyBusinessId
      ? legacyBusinessId.toLowerCase().startsWith("id:")
        ? legacyBusinessId.slice(3).trim()
        : legacyBusinessId
      : undefined,
  }
}

let cachedEnv: ServerEnv | null = null

export function getServerEnv(): ServerEnv {
  if (cachedEnv) return cachedEnv
  cachedEnv = serverEnvSchema.parse(readRaw())
  return cachedEnv
}

export function getServerEnvIssues(): string[] {
  const parsed = serverEnvSchema.safeParse(readRaw())
  if (parsed.success) return []
  return parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`)
}

/** Feature flags derived from configured integrations. Never exposes secret values. */
export function getIntegrationStatus() {
  const raw = readRaw()
  return {
    supabase: Boolean(raw.SUPABASE_URL && raw.SUPABASE_SERVICE_ROLE_KEY),
    ingestSecret: Boolean(raw.ORDERFLOW_INGEST_SECRET),
    kdsTokenSecret: Boolean(raw.KDS_TOKEN_SECRET),
    openai: Boolean(raw.OPENAI_API_KEY),
    vapi: Boolean(raw.VAPI_API_KEY),
    sms: Boolean(raw.TELNYX_API_KEY && raw.TELNYX_FROM_NUMBER),
    backendUrl: raw.BACKEND_URL ?? null,
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? null,
    legacyBusinessId: Boolean(raw.ORDERFLOW_BUSINESS_ID),
    stripe: Boolean(raw.STRIPE_SECRET_KEY),
    stripeWebhook: Boolean(raw.STRIPE_WEBHOOK_SECRET),
    // Whether every plan has a Stripe Price id attached is now a database
    // question (Admin -> Plans), not an env var -- see the System Health
    // page, which checks plan_tiers directly instead of reading this flag.
  }
}

export function getAppUrl(fallbackOrigin?: string) {
  return process.env.NEXT_PUBLIC_APP_URL ?? fallbackOrigin ?? "http://localhost:3000"
}
