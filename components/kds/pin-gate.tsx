"use client"

import { useEffect, useState } from "react"

const TOKEN_KEY = (slug: string) => `kds_token_${slug}`

async function verifyPin(slug: string, pin: string): Promise<string | null> {
  const res = await fetch(`/api/display/${encodeURIComponent(slug)}/verify-pin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin }),
  })
  const data = (await res.json()) as { ok: boolean; token?: string; message?: string }
  return data.ok && data.token ? data.token : null
}

async function checkNoPin(slug: string): Promise<string | null> {
  // If no PIN is set the endpoint returns a token with an empty PIN attempt
  return verifyPin(slug, "")
}

export function usePinGate(slug: string | undefined): {
  unlocked: boolean
  checking: boolean
} {
  const [unlocked, setUnlocked] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (!slug) { setUnlocked(true); setChecking(false); return }

    const stored = localStorage.getItem(TOKEN_KEY(slug))

    // Validate stored token server-side by using it as a "no-pin" check
    // — if already unlocked, just trust it (expiry is checked server-side on every PATCH)
    if (stored) {
      setUnlocked(true)
      setChecking(false)
      return
    }

    // No token — check if this display has no PIN set (open access).
    // If the API errors (e.g. migration not yet run), fail open so the
    // display still works rather than blocking staff permanently.
    checkNoPin(slug).then((token) => {
      if (token) {
        localStorage.setItem(TOKEN_KEY(slug), token)
        setUnlocked(true)
      }
      setChecking(false)
    }).catch(() => {
      setUnlocked(true)
      setChecking(false)
    })
  }, [slug])

  return { unlocked, checking }
}

interface PinGateProps {
  slug: string
  onUnlock: () => void
}

export function PinGate({ slug, onUnlock }: PinGateProps) {
  const [pin, setPin] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (pin.length < 4) { setError("PIN must be at least 4 digits."); return }
    setLoading(true)
    setError(null)
    const token = await verifyPin(slug, pin)
    setLoading(false)
    if (token) {
      localStorage.setItem(TOKEN_KEY(slug), token)
      onUnlock()
    } else {
      setError("Incorrect PIN. Try again.")
      setPin("")
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-sm space-y-6 p-8 rounded-xl border border-border bg-card">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold">Kitchen Display</h1>
          <p className="text-sm text-muted-foreground">Enter your PIN to continue</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            inputMode="numeric"
            maxLength={8}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            placeholder="••••"
            autoFocus
            className="w-full rounded-md border border-input bg-background px-4 py-3 text-center text-2xl tracking-[0.5em] outline-none focus:ring-2 focus:ring-ring"
          />
          {error && <p className="text-sm text-destructive text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading || pin.length < 4}
            className="w-full rounded-md bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {loading ? "Checking..." : "Unlock"}
          </button>
        </form>
      </div>
    </div>
  )
}
