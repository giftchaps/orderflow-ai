import Link from "next/link"
import { CheckCircle2, Circle, ChevronRight } from "lucide-react"
import type { ChecklistItem } from "@/lib/business-shared"
import { cn } from "@/lib/utils"

export function SetupChecklist({ items, className }: { items: ChecklistItem[]; className?: string }) {
  const done = items.filter((i) => i.done).length
  const pct = items.length ? Math.round((done / items.length) * 100) : 0

  return (
    <div className={cn("flex flex-col gap-4 rounded-xl border bg-card p-5", className)}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <p className="font-medium">Launch checklist</p>
          <p className="text-sm text-muted-foreground">
            {done} of {items.length} complete
          </p>
        </div>
        <span className="text-2xl font-semibold tabular-nums">{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${pct}%` }} />
      </div>
      <ul className="flex flex-col divide-y">
        {items.map((item) => (
          <li key={item.key}>
            <Link href={item.href} className="group flex items-center gap-3 py-3 text-sm">
              {item.done ? (
                <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />
              ) : (
                <Circle className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              )}
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={cn("font-medium", item.done && "text-muted-foreground")}>{item.label}</span>
                <span className="truncate text-xs text-muted-foreground">{item.description}</span>
              </span>
              <ChevronRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
