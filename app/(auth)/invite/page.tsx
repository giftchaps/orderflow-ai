"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthFrame } from "@/components/auth/auth-frame"

export default function InvitePage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  // Supabase invite links carry tokens in the URL hash; exchange them for a session.
  useEffect(() => {
    const supabase = createClient()
    const run = async () => {
      const params = new URLSearchParams(window.location.hash.replace("#", ""))
      const accessToken = params.get("access_token")
      const refreshToken = params.get("refresh_token")

      if (accessToken && refreshToken) {
        const { error: setErr } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        if (setErr) return setError("This invite link is invalid or has expired. Ask for a new one.")
        window.history.replaceState(null, "", window.location.pathname)
        setSessionReady(true)
        return
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session) setSessionReady(true)
      else setError("This invite link is invalid or has expired. Ask for a new one.")
    }
    run()
  }, [])

  const handleAccept = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    const {
      data: { session },
    } = await supabase.auth.getSession()

    const res = await fetch("/api/auth/accept-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, accessToken: session?.access_token }),
    })
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      setError(body.error ?? "Could not finish setting up your account.")
      setLoading(false)
      return
    }

    router.replace("/auth/continue")
  }

  return (
    <AuthFrame title="Accept your invitation" description="Choose a password to finish setting up your account.">
      <form onSubmit={handleAccept} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Your full name</Label>
          <Input id="name" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">At least 8 characters.</p>
        </div>

        {error && (
          <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" disabled={loading || !sessionReady}>
          {(loading || !sessionReady) && !error && <Loader2 className="size-4 animate-spin" />}
          {loading ? "Setting up…" : !sessionReady ? "Verifying invite…" : "Accept invitation"}
        </Button>
      </form>
    </AuthFrame>
  )
}
