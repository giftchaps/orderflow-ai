"use client"

import { useState } from "react"
import { Phone, Database, Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import { createClient } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface ConfigDialogProps {
  onConnect: (url: string, key: string, businessId: string) => void
  onDemo: () => void
}

type ConnectionStatus = "idle" | "testing" | "success" | "error"

interface ValidationError {
  field: "url" | "key" | "businessId" | "connection"
  message: string
}

export function ConfigDialog({ onConnect, onDemo }: ConfigDialogProps) {
  const [url, setUrl] = useState("")
  const [key, setKey] = useState("")
  const [businessId, setBusinessId] = useState("")
  const [status, setStatus] = useState<ConnectionStatus>("idle")
  const [error, setError] = useState<ValidationError | null>(null)

  const validateInputs = (): ValidationError | null => {
    // Validate URL format
    if (!url.trim()) {
      return { field: "url", message: "Supabase URL is required" }
    }
    
    const urlPattern = /^https:\/\/[a-zA-Z0-9-]+\.supabase\.co$/
    if (!urlPattern.test(url.trim())) {
      return { 
        field: "url", 
        message: "Invalid URL format. Expected: https://xxxxx.supabase.co" 
      }
    }

    // Validate API key format (JWT)
    if (!key.trim()) {
      return { field: "key", message: "Supabase Anon Key is required" }
    }
    
    if (!key.startsWith("eyJ") || key.length < 100) {
      return { 
        field: "key", 
        message: "Invalid API key format. Should start with 'eyJ' and be a JWT token" 
      }
    }

    // Validate business ID (UUID format)
    if (!businessId.trim()) {
      return { field: "businessId", message: "Business ID is required" }
    }
    
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidPattern.test(businessId.trim())) {
      return { 
        field: "businessId", 
        message: "Invalid Business ID format. Expected UUID (e.g., 123e4567-e89b-12d3-a456-426614174000)" 
      }
    }

    return null
  }

  const testConnection = async () => {
    // Clear previous errors
    setError(null)
    
    // Validate inputs first
    const validationError = validateInputs()
    if (validationError) {
      setError(validationError)
      return
    }

    setStatus("testing")

    try {
      // Create Supabase client with provided credentials
      const supabase = createClient(url.trim(), key.trim())

      // Test 1: Try to query the orders table to verify connection and table exists
      const { data, error: queryError } = await supabase
        .from("orders")
        .select("id")
        .eq("business_id", businessId.trim())
        .limit(1)

      if (queryError) {
        // Check for common error types
        if (queryError.code === "PGRST301" || queryError.message.includes("JWT")) {
          setError({ 
            field: "key", 
            message: "Invalid API key. Please check your Supabase anon key." 
          })
          setStatus("error")
          return
        }
        
        if (queryError.code === "42P01" || queryError.message.includes("does not exist")) {
          setError({ 
            field: "connection", 
            message: "The 'orders' table does not exist in your database. Please run the setup script first." 
          })
          setStatus("error")
          return
        }

        if (queryError.message.includes("FetchError") || queryError.message.includes("fetch")) {
          setError({ 
            field: "url", 
            message: "Could not connect to Supabase. Please check your project URL." 
          })
          setStatus("error")
          return
        }

        // Generic error
        setError({ 
          field: "connection", 
          message: `Connection failed: ${queryError.message}` 
        })
        setStatus("error")
        return
      }

      // Test 2: Verify business_id exists or the query worked
      // If we got here without error, connection is successful
      
      // Connection successful
      setStatus("success")
      
      // Wait a moment to show success state, then connect
      setTimeout(() => {
        onConnect(url.trim(), key.trim(), businessId.trim())
      }, 1000)

    } catch (err) {
      // Handle network or unexpected errors
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred"
      
      if (errorMessage.includes("Failed to fetch") || errorMessage.includes("NetworkError")) {
        setError({ 
          field: "url", 
          message: "Network error. Please check your internet connection and Supabase URL." 
        })
      } else {
        setError({ 
          field: "connection", 
          message: `Unexpected error: ${errorMessage}` 
        })
      }
      setStatus("error")
    }
  }

  const getInputClassName = (field: "url" | "key" | "businessId") => {
    const base = "bg-input border font-mono text-sm transition-colors"
    if (error?.field === field) {
      return `${base} border-red-500 focus:border-red-500 focus:ring-red-500/20`
    }
    if (status === "success") {
      return `${base} border-emerald-500`
    }
    return `${base} border-border`
  }

  const getStatusIcon = () => {
    switch (status) {
      case "testing":
        return <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-emerald-500" />
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return null
    }
  }

  const getStatusMessage = () => {
    switch (status) {
      case "testing":
        return "Testing connection..."
      case "success":
        return "Connected successfully! Redirecting..."
      case "error":
        return null // Error shown separately
      default:
        return null
    }
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
              onChange={(e) => {
                setUrl(e.target.value)
                setError(null)
                setStatus("idle")
              }}
              className={getInputClassName("url")}
              disabled={status === "testing" || status === "success"}
            />
            {error?.field === "url" && (
              <p className="text-xs text-red-500 flex items-center gap-1.5 mt-1">
                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                {error.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
              Supabase Anon Key
            </Label>
            <Input
              placeholder="eyJhbGci..."
              value={key}
              onChange={(e) => {
                setKey(e.target.value)
                setError(null)
                setStatus("idle")
              }}
              className={getInputClassName("key")}
              type="password"
              disabled={status === "testing" || status === "success"}
            />
            {error?.field === "key" && (
              <p className="text-xs text-red-500 flex items-center gap-1.5 mt-1">
                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                {error.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
              Business ID
            </Label>
            <Input
              placeholder="123e4567-e89b-12d3-a456-426614174000"
              value={businessId}
              onChange={(e) => {
                setBusinessId(e.target.value)
                setError(null)
                setStatus("idle")
              }}
              className={getInputClassName("businessId")}
              disabled={status === "testing" || status === "success"}
            />
            {error?.field === "businessId" && (
              <p className="text-xs text-red-500 flex items-center gap-1.5 mt-1">
                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                {error.message}
              </p>
            )}
          </div>

          {/* Connection status feedback */}
          {(status !== "idle" || error?.field === "connection") && (
            <div 
              className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                status === "testing" 
                  ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" 
                  : status === "success" 
                    ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                    : "bg-red-500/10 text-red-500 border border-red-500/20"
              }`}
            >
              {getStatusIcon()}
              <span>
                {getStatusMessage() || (error?.field === "connection" ? error.message : null)}
              </span>
            </div>
          )}

          <Button
            onClick={testConnection}
            disabled={status === "testing" || status === "success"}
            className="w-full bg-[oklch(0.55_0.2_25)] hover:bg-[oklch(0.5_0.2_25)] text-white font-semibold h-12 disabled:opacity-50"
          >
            {status === "testing" ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Testing Connection...
              </>
            ) : status === "success" ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Connected!
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                Connect Kitchen Display
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={onDemo}
            disabled={status === "testing" || status === "success"}
            className="w-full border-border text-muted-foreground hover:text-foreground h-10 disabled:opacity-50"
          >
            Demo Mode (no Supabase needed)
          </Button>
        </div>
      </div>
    </div>
  )
}
