"use client"

import { AlertCircle, CheckCircle2, Database, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ConfigDialogProps {
  onDemo: () => void
  issues?: string[]
}

export function ConfigDialog({ onDemo, issues = [] }: ConfigDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 shadow-2xl">
        <div className="mb-2 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[oklch(0.55_0.2_25)]">
            <Phone className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">OrderFlow AI</h2>
            <p className="text-sm text-muted-foreground">Kitchen Display System</p>
          </div>
        </div>

        <p className="mb-6 text-sm text-muted-foreground">
          Database access now runs through protected server-side routes instead of storing credentials in the browser.
        </p>

        <div className="space-y-5">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-500" />
              <div>
                <p className="font-semibold text-emerald-500">Required setup</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `ORDERFLOW_BUSINESS_ID`
                  to your environment, then restart the app.
                </p>
              </div>
            </div>
          </div>

          {issues.length > 0 && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 text-red-500" />
                <div className="space-y-2">
                  <p className="font-semibold text-red-500">Current startup issues</p>
                  {issues.map((issue) => (
                    <p key={issue} className="text-sm text-red-500/90">
                      {issue}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}

          <Button
            variant="outline"
            onClick={onDemo}
            className="h-10 w-full border-border text-muted-foreground hover:text-foreground"
          >
            Demo Mode (no Supabase needed)
          </Button>

          <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
              <Database className="mt-0.5 h-4 w-4 text-[oklch(0.55_0.2_25)]" />
              <p>
                Once the environment is valid, the app automatically checks the database and loads active orders through `/api/orders`.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
