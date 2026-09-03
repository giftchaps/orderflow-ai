import Link from "next/link"
import { notFound } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BusinessOperationsPanel } from "./business-operations-panel"

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
    .select("id, name, slug, address, timezone, owner_email, plan, is_active, created_at, vapi_assistant_id, phone_number")
    .eq("slug", slug)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!business) notFound()

  const { data: displaySettings, error: displaySettingsError } = await supabase
    .from("businesses")
    .select("display_pin")
    .eq("id", business.id)
    .maybeSingle()

  const { data: staff } = await supabase
    .from("businesses_staff")
    .select("id, email, role, user_id, name")
    .eq("business_id", business.id)

  const ownerStaff = staff?.find((s) => s.role === "owner")
  const ownerLinked = !!ownerStaff?.user_id

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
          {warning && (
            <div className="text-sm text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-md px-3 py-2">
              {warning}
            </div>
          )}
          <p><span className="text-muted-foreground">Owner Email:</span> {business.owner_email ?? "-"}</p>
          <p><span className="text-muted-foreground">Timezone:</span> {business.timezone ?? "-"}</p>
          <p><span className="text-muted-foreground">Address:</span> {business.address ?? "-"}</p>
          <p><span className="text-muted-foreground">Staff Members:</span> {staff?.length ?? 0}</p>
          <p><span className="text-muted-foreground">Created:</span> {new Date(business.created_at).toLocaleString()}</p>
          <div className="flex items-center gap-2 pt-1">
            <span className="text-muted-foreground">Owner Account:</span>
            {ownerLinked ? (
              <Badge className="bg-green-600 hover:bg-green-600">Activated</Badge>
            ) : (
              <Badge variant="secondary">Invite Pending</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <BusinessOperationsPanel
        business={{
          ...business,
          display_pin: displaySettings?.display_pin ?? null,
          vapi_assistant_id: business.vapi_assistant_id ?? null,
          phone_number: business.phone_number ?? null,
        }}
        staff={staff ?? []}
        displayPinAvailable={!displaySettingsError}
      />

      <div className="flex gap-2">
        <Link href="/admin/businesses">
          <Button variant="outline">Back to Businesses</Button>
        </Link>
        <Link href={`/admin/businesses/${business.slug}/dashboard`}>
          <Button>Open Business Dashboard</Button>
        </Link>
      </div>
    </div>
  )
}
