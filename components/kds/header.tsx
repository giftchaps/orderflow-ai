"use client"

import { useEffect, useState } from "react"
import { Phone, Wifi } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface HeaderProps {
  orderCount: number
}

function Clock() {
  const [time, setTime] = useState<string | null>(null)

  useEffect(() => {
    const updateTime = () => {
      setTime(new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }))
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  if (!time) {
    return (
      <div className="text-2xl font-mono font-bold tabular-nums tracking-tight">
        --:-- --
      </div>
    )
  }

  return (
    <div className="text-2xl font-mono font-bold tabular-nums tracking-tight">
      {time}
    </div>
  )
}

export function Header({ orderCount }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 border-b border-border">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-[oklch(0.55_0.2_25)] flex items-center justify-center">
              <Phone className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Provenzano&apos;s</h1>
              <p className="text-xs text-muted-foreground uppercase tracking-widest">Kitchen Display</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <Badge 
            variant="secondary" 
            className="bg-[oklch(0.55_0.2_25)] hover:bg-[oklch(0.55_0.2_25)] text-white border-0 px-4 py-1.5 text-sm font-semibold"
          >
            {orderCount} Active Orders
          </Badge>
          
          <Clock />
          
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-[oklch(0.65_0.18_145)] animate-pulse-slow shadow-[0_0_8px_oklch(0.65_0.18_145)]" />
            <Wifi className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </div>
    </header>
  )
}
