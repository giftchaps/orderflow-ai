import "server-only"

import { z } from "zod"

const serverEnvSchema = z.object({
  SUPABASE_URL: z.string().url("SUPABASE_URL must be a valid URL"),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
  ORDERFLOW_BUSINESS_ID: z
    .string()
    .uuid("ORDERFLOW_BUSINESS_ID must be a valid UUID"),
})

export type ServerEnv = z.infer<typeof serverEnvSchema>

let cachedEnv: ServerEnv | null = null

export function getServerEnv(): ServerEnv {
  if (cachedEnv) {
    return cachedEnv
  }

  cachedEnv = serverEnvSchema.parse({
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ORDERFLOW_BUSINESS_ID: process.env.ORDERFLOW_BUSINESS_ID,
  })

  return cachedEnv
}

export function getServerEnvIssues(): string[] {
  const parsed = serverEnvSchema.safeParse({
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ORDERFLOW_BUSINESS_ID: process.env.ORDERFLOW_BUSINESS_ID,
  })

  if (parsed.success) {
    return []
  }

  return parsed.error.issues.map((issue) => issue.message)
}
