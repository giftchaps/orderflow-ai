import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function StatCard({
  label,
  value,
  hint,
  href,
  tone = "default",
  icon: Icon,
  className,
}: {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  href?: string
  tone?: "default" | "success" | "warning" | "danger" | "brand"
  icon?: React.ComponentType<{ className?: string }>
  className?: string
}) {
  const toneClass = {
    default: "text-foreground",
    success: "text-success",
    warning: "text-warning-foreground",
    danger: "text-destructive",
    brand: "text-brand",
  }[tone]

  const content = (
    <Card
      className={cn(
        "relative flex flex-col gap-2 p-5 shadow-none transition-colors",
        href && "hover:border-foreground/20",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>{label}</span>
        {Icon ? <Icon className="size-4" /> : href ? <ArrowUpRight className="size-4" /> : null}
      </div>
      <div className={cn("text-3xl font-semibold tabular-nums tracking-tight", toneClass)}>{value}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </Card>
  )

  if (href) {
    return (
      <Link href={href} className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {content}
      </Link>
    )
  }
  return content
}

export function StatGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-4", className)}>{children}</div>
}
