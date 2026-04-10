"use client"

import { useEffect, useState } from "react"
import { Phone, Wifi, WifiOff, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error"

interface HeaderProps {
  orderCount: number
  connectionStatus: ConnectionStatus
  connectionError?: string | null
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

function ConnectionIndicator({ status, error }: { status: ConnectionStatus; error?: string | null }) {
  const statusConfig = {
    disconnected: {
      color: "bg-muted-foreground",
      icon: WifiOff,
      label: "Disconnected",
      description: "Not connected to database",
    },
    connecting: {
      color: "bg-[oklch(0.8_0.16_85)]",
      icon: Wifi,
      label: "Connecting",
      description: "Establishing connection...",
      animate: true,
    },
    connected: {
      color: "bg-[oklch(0.65_0.18_145)]",
      icon: Wifi,
      label: "Connected",
      description: "Real-time sync active",
      glow: true,
    },
    error: {
      color: "bg-destructive",
      icon: AlertCircle,
      label: "Connection Error",
      description: error || "Failed to connect to database",
    },
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 cursor-help">
            <div 
              className={`h-2.5 w-2.5 rounded-full ${config.color} ${
                config.glow ? "animate-pulse-slow shadow-[0_0_8px_oklch(0.65_0.18_145)]" : ""
              } ${config.animate ? "animate-pulse" : ""}`} 
            />
            <Icon className={`h-4 w-4 ${status === "connected" ? "text-[oklch(0.65_0.18_145)]" : status === "error" ? "text-destructive" : "text-muted-foreground"}`} />
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-card border-border">
          <div className="text-sm">
            <p className="font-medium">{config.label}</p>
            <p className="text-muted-foreground text-xs">{config.description}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function Header({ orderCount, connectionStatus, connectionError }: HeaderProps) {
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
          
          <ConnectionIndicator status={connectionStatus} error={connectionError} />
        </div>
      </div>
    </header>
  )
}
