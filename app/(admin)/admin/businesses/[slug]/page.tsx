import Link from "next/link"
import { notFound } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ warning?: string }>
}

export default async function AdminBusinessDetailsPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { warning } = await searchParams
  const supabase = createSupabaseServerClient()

  const { data: business, error } = await supabase
    .from("businesses")
    .select("id, name, slug, address, timezone, owner_email, plan, is_active, created_at")
    .eq("slug", slug)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!business) {
    notFound()
  }

  const { data: staff } = await supabase
    .from("businesses_staff")
    .select("id")
    .eq("business_id", business.id)

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{business.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">Slug: {business.slug}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="capitalize">{business.plan ?? "growth"}</Badge>
          <Badge className={business.is_active ? "bg-green-600 hover:bg-green-600" : ""} variant={business.is_active ? "default" : "secondary"}>
            {business.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle>Business Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {warning ? (
            <div className="text-sm text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-md px-3 py-2">
              {warning}
            </div>
          ) : null}
          <p><span className="text-muted-foreground">Owner Email:</span> {business.owner_email ?? "-"}</p>
          <p><span className="text-muted-foreground">Timezone:</span> {business.timezone ?? "-"}</p>
          <p><span className="text-muted-foreground">Address:</span> {business.address ?? "-"}</p>
          <p><span className="text-muted-foreground">Staff Members:</span> {staff?.length ?? 0}</p>
          <p><span className="text-muted-foreground">Created:</span> {new Date(business.created_at).toLocaleString()}</p>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Link href="/admin/businesses">
          <Button variant="outline">Back to Businesses</Button>
        </Link>
        <Link href="/business/dashboard">
          <Button>Open Business Dashboard</Button>
        </Link>
      </div>
    </div>
  )
}
