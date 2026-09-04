"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

export function SignOutButton({ variant = "outline" }: { variant?: "outline" | "ghost" | "default" }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  const signOut = async () => {
    setPending(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    await fetch("/api/auth/switch-business", { method: "DELETE" }).catch(() => undefined)
    router.replace("/login")
    router.refresh()
  }

  return (
    <Button variant={variant} onClick={signOut} disabled={pending} className="w-full">
      <LogOut className="size-4" />
      Sign out
    </Button>
  )
}
