"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Phone } from "lucide-react"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    const exchangeToken = async () => {
      // PKCE flow: token arrives as ?code= query param
      const searchParams = new URLSearchParams(window.location.search)
      const code = searchParams.get("code")

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          setError("Invalid or expired reset link. Request a new one.")
          return
        }
        window.history.replaceState(null, "", window.location.pathname)
        setSessionReady(true)
        return
      }

      // Legacy implicit flow: token arrives in URL hash
      const hash = window.location.hash
      const hashParams = new URLSearchParams(hash.replace("#", ""))
      const accessToken = hashParams.get("access_token")
      const refreshToken = hashParams.get("refresh_token")
      const type = hashParams.get("type")

      if (accessToken && refreshToken && type === "recovery") {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        if (error) {
          setError("Invalid or expired reset link. Request a new one.")
          return
        }
        window.history.replaceState(null, "", window.location.pathname)
        setSessionReady(true)
        return
      }

      // Already have a valid session (e.g. navigated back to this page)
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setSessionReady(true)
      } else {
        setError("Invalid or expired reset link. Request a new one.")
      }
    }

    exchangeToken()
  }, [])

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError("Passwords do not match.")
      return
    }
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    router.push("/login")
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="h-14 w-14 rounded-xl bg-[oklch(0.55_0.2_25)] flex items-center justify-center">
            <Phone className="h-7 w-7 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">OrderFlow AI</h1>
            <p className="text-sm text-muted-foreground">by ResurgeX Technologies</p>
          </div>
        </div>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>Reset your password</CardTitle>
            <CardDescription>Choose a new password for your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Choose a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  disabled={!sessionReady}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm password</Label>
                <Input
                  id="confirm"
                  type="password"
                  placeholder="Repeat your password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={8}
                  disabled={!sessionReady}
                />
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={loading || !sessionReady}>
                {loading ? "Saving..." : !sessionReady ? "Verifying link..." : "Set new password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
