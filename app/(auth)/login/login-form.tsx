"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthFrame } from "@/components/auth/auth-frame"

type Mode = "signin" | "forgot" | "forgot-sent"

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get("next")

  const [mode, setMode] = useState<Mode>("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<string | null>(null)

  const normalizedEmail = () => email.trim().toLowerCase()

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const redirectTo = `${window.location.origin}/reset-password`
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail(), { redirectTo })
    setLoading(false)
    if (resetError) return setError(resetError.message)
    setMode("forgot-sent")
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setStep("Signing in…")

    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail(),
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      setStep(null)
      return
    }

    setStep("Loading your workspace…")
    const token = data.session?.access_token
    const res = await fetch("/api/auth/me", { headers: token ? { Authorization: `Bearer ${token}` } : undefined })
    const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; landing?: string }

    if (!res.ok) {
      if (res.status === 403) {
        router.replace("/no-access")
        return
      }
      setError(body.error ?? "We could not load your account. Please try again.")
      setLoading(false)
      setStep(null)
      return
    }

    setStep("Redirecting…")
    const target = next && next.startsWith("/") ? `/auth/continue?next=${encodeURIComponent(next)}` : "/auth/continue"
    router.replace(target)
  }

  if (mode === "forgot-sent") {
    return (
      <AuthFrame title="Check your inbox" description={`We sent a password reset link to ${email}.`}>
        <Button variant="outline" className="w-full" onClick={() => setMode("signin")}>
          Back to sign in
        </Button>
      </AuthFrame>
    )
  }

  if (mode === "forgot") {
    return (
      <AuthFrame title="Reset your password" description="Enter the email on your account and we'll send a reset link.">
        <form onSubmit={handleForgot} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>
          {error && <ErrorNote>{error}</ErrorNote>}
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            Send reset link
          </Button>
          <button
            type="button"
            onClick={() => {
              setMode("signin")
              setError(null)
            }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Back to sign in
          </button>
        </form>
      </AuthFrame>
    )
  }

  return (
    <AuthFrame
      title="Sign in"
      description="Use the email address you were invited with."
      footer={
        <p>
          Don&apos;t have an account? Access is by invitation — ask your business owner or the OrderFlow team.
        </p>
      }
    >
      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@restaurant.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <button
              type="button"
              onClick={() => {
                setMode("forgot")
                setError(null)
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        {error && <ErrorNote>{error}</ErrorNote>}

        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="size-4 animate-spin" />}
          {loading ? step ?? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthFrame>
  )
}

function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {children}
    </p>
  )
}
