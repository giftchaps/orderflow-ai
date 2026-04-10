"use client"

import { Bell } from "lucide-react"

interface OrderToastProps {
  message: string
}

export function OrderToast({ message }: OrderToastProps) {
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-3 bg-[oklch(0.65_0.18_145)] text-white px-6 py-4 rounded-full shadow-[0_8px_30px_oklch(0.65_0.18_145/0.4)] font-semibold">
        <Bell className="h-5 w-5" />
        {message}
      </div>
    </div>
  )
}
