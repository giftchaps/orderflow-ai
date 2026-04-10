"use client"

import { useState } from "react"
import { Phone, Database } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface ConfigDialogProps {
  onConnect: (url: string, key: string, businessId: string) => void
  onDemo: () => void
}

export function ConfigDialog({ onConnect, onDemo }: ConfigDialogProps) {
  const [url, setUrl] = useState("")
  const [key, setKey] = useState("")
  const [businessId, setBusinessId] = useState("")

  const handleConnect = () => {
    if (!url || !key || !businessId) {
      alert("Please fill in all fields")
      return
    }
    onConnect(url, key, businessId)
  }

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-12 w-12 rounded-xl bg-[oklch(0.55_0.2_25)] flex items-center justify-center">
            <Phone className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">OrderFlow AI</h2>
            <p className="text-sm text-muted-foreground">Kitchen Display System</p>
          </div>
        </div>
        
        <p className="text-muted-foreground text-sm mb-8">
          Connect to your Supabase project to receive live orders
        </p>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
              Supabase Project URL
            </Label>
            <Input
              placeholder="https://xxxx.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="bg-input border-border font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
              Supabase Anon Key
            </Label>
            <Input
              placeholder="eyJhbGci..."
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="bg-input border-border font-mono text-sm"
              type="password"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
              Business ID
            </Label>
            <Input
              placeholder="uuid-of-your-business"
              value={businessId}
              onChange={(e) => setBusinessId(e.target.value)}
              className="bg-input border-border font-mono text-sm"
            />
          </div>

          <Button
            onClick={handleConnect}
            className="w-full bg-[oklch(0.55_0.2_25)] hover:bg-[oklch(0.5_0.2_25)] text-white font-semibold h-12"
          >
            <Database className="h-4 w-4 mr-2" />
            Connect Kitchen Display
          </Button>

          <Button
            variant="outline"
            onClick={onDemo}
            className="w-full border-border text-muted-foreground hover:text-foreground h-10"
          >
            Demo Mode (no Supabase needed)
          </Button>
        </div>
      </div>
    </div>
  )
}
