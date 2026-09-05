import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react"
import { getServerEnvIssues, getIntegrationStatus } from "@/lib/env"
import { fetchPlanTiers } from "@/lib/plans"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/portal/page-header"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"
export const metadata = { title: "System health" }

type CheckState = "ok" | "warn" | "off" | "error"

type Check = {
  label: string
  description: string
  state: CheckState
  detail?: string
}

async function checkDatabase(): Promise<Check> {
  try {
    const supabase = createSupabaseServerClient()
    const { error } = await supabase.from("orders").select("id", { count: "exact", head: true }).limit(1)
    if (error) return { label: "Database", description: "Supabase connection used for every read and write.", state: "error", detail: error.message }
    return { label: "Database", description: "Supabase connection used for every read and write.", state: "ok" }
  } catch (err) {
    return {
      label: "Database",
      description: "Supabase connection used for every read and write.",
      state: "error",
      detail: err instanceof Error ? err.message : "Unable to reach Supabase.",
    }
  }
}

export default async function SystemHealthPage() {
  const envIssues = getServerEnvIssues()
  const integrations = getIntegrationStatus()
  const [dbCheck, planTiers] = await Promise.all([checkDatabase(), fetchPlanTiers().catch(() => [])])
  const plansMissingPrice = planTiers.filter((t) => !t.stripePriceId).map((t) => t.label)

  const checks: Check[] = [
    dbCheck,
    {
      label: "Voice agent (Vapi)",
      description: "Pushes regenerated prompts and menu updates to Vapi assistants.",
      state: integrations.vapi ? "ok" : "off",
    },
    {
      label: "Menu extraction (OpenAI)",
      description: "Parses uploaded menu photos/PDFs into structured items during onboarding.",
      state: integrations.openai ? "ok" : "off",
    },
    {
      label: "SMS notifications (Telnyx)",
      description: "Sends order-confirmation and ready texts to customers.",
      state: integrations.sms ? "ok" : "off",
    },
    {
      label: "Billing (Stripe)",
      description: "Lets businesses subscribe and pay via Stripe Checkout.",
      state:
        integrations.stripe && integrations.stripeWebhook && plansMissingPrice.length === 0
          ? "ok"
          : integrations.stripe
            ? "warn"
            : "off",
      detail: !integrations.stripe
        ? "STRIPE_SECRET_KEY is not set."
        : !integrations.stripeWebhook
          ? "STRIPE_WEBHOOK_SECRET is not set — subscription status won't sync after checkout."
          : plansMissingPrice.length > 0
            ? `No Stripe price set for: ${plansMissingPrice.join(", ")}. Add one in Admin → Plans — checkout will fail for that plan until you do.`
            : undefined,
    },
    {
      label: "Order ingest secret",
      description: "Shared secret required on the legacy single-tenant order-ingest endpoint.",
      state: integrations.ingestSecret ? "ok" : "warn",
      detail: integrations.ingestSecret ? undefined : "Not set — the legacy ingest endpoint accepts unauthenticated writes.",
    },
    {
      label: "Kitchen display tokens",
      description: "Signs display links and PIN hashes.",
      state: integrations.kdsTokenSecret ? "ok" : "warn",
      detail: integrations.kdsTokenSecret ? undefined : "Falling back to the Supabase service role key.",
    },
    {
      label: "Legacy single-tenant business ID",
      description: "ORDERFLOW_BUSINESS_ID — only used as a fallback when a request has no business slug/session.",
      state: integrations.legacyBusinessId ? "warn" : "off",
      detail: integrations.legacyBusinessId ? "Configured. Should only be set for the legacy voice backend, not new deployments." : "Not set.",
    },
  ]

  const backendConfigured = Boolean(integrations.backendUrl)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="System health" description="Live status of the integrations OrderFlow AI depends on." />

      {envIssues.length > 0 && (
        <Card className="border-destructive/40 bg-destructive/5 p-5 shadow-none">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
            <div className="flex flex-col gap-1">
              <p className="font-medium text-destructive">Server environment is misconfigured</p>
              <ul className="list-inside list-disc text-sm text-muted-foreground">
                {envIssues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {checks.map((check) => (
          <CheckCard key={check.label} check={check} />
        ))}
      </div>

      <Card className="p-5 shadow-none">
        <div className="flex flex-col gap-1">
          <p className="font-medium">Voice backend</p>
          <p className="text-sm text-muted-foreground">
            {backendConfigured ? (
              <>
                Configured at <code className="rounded bg-secondary px-1 py-0.5 text-xs">{integrations.backendUrl}</code>. The FastAPI
                backend writes orders directly to Supabase using the service-role key — it does not call this app&apos;s API.
              </>
            ) : (
              "BACKEND_URL is not set. This only affects tooling that needs to reach the voice backend directly; the backend itself writes straight to Supabase regardless."
            )}
          </p>
        </div>
      </Card>
    </div>
  )
}

function CheckCard({ check }: { check: Check }) {
  const style: Record<CheckState, { icon: typeof CheckCircle2; className: string; badge: string; label: string }> = {
    ok: { icon: CheckCircle2, className: "text-success", badge: "bg-status-ready-bg text-success", label: "Connected" },
    warn: { icon: AlertTriangle, className: "text-warning-foreground", badge: "bg-status-pending-bg text-warning-foreground", label: "Attention" },
    off: { icon: XCircle, className: "text-muted-foreground", badge: "bg-secondary text-muted-foreground", label: "Not configured" },
    error: { icon: XCircle, className: "text-destructive", badge: "bg-status-making-bg text-destructive", label: "Error" },
  }
  const s = style[check.state]
  const Icon = s.icon
  return (
    <Card className="p-5 shadow-none">
      <div className="flex items-start gap-3">
        <Icon className={cn("mt-0.5 size-5 shrink-0", s.className)} />
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium">{check.label}</p>
            <Badge variant="outline" className={cn("border-transparent font-medium", s.badge)}>
              {s.label}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{check.description}</p>
          {check.detail && <p className="text-xs text-muted-foreground">{check.detail}</p>}
        </div>
      </div>
    </Card>
  )
}
