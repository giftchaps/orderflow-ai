"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

const TABS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Live" },
  { value: "invited", label: "Invited" },
  { value: "draft", label: "Draft" },
  { value: "suspended", label: "Suspended" },
]

export function BusinessFilters({
  status,
  q,
  counts,
}: {
  status: string
  q: string
  counts: Record<string, number>
}) {
  const router = useRouter()
  const params = useSearchParams()

  const update = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    router.replace(`/admin/businesses?${next.toString()}`)
  }

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <Tabs value={status} onValueChange={(v) => update({ status: v === "all" ? undefined : v })}>
        <TabsList className="h-9">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="gap-1.5 px-3 text-xs">
              {t.label}
              <span className="rounded-full bg-background/70 px-1.5 text-[10px] tabular-nums text-muted-foreground">
                {counts[t.value] ?? 0}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <form
        className="relative w-full md:w-72"
        onSubmit={(e) => {
          e.preventDefault()
          const value = (new FormData(e.currentTarget).get("q") as string) ?? ""
          update({ q: value.trim() || undefined })
        }}
      >
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input name="q" defaultValue={q} placeholder="Search name, slug or owner" className="h-9 pl-8" aria-label="Search businesses" />
      </form>
    </div>
  )
}
