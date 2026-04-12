import { createSupabaseServerClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"

export default async function BusinessesPage() {
  const supabase = createSupabaseServerClient()

  const { data: businesses } = await supabase
    .from("businesses")
    .select("id, name, slug, is_active, created_at, phone_number, plan")
    .order("created_at", { ascending: false })

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Businesses</h1>
          <p className="text-muted-foreground text-sm mt-1">{businesses?.length ?? 0} businesses on the platform</p>
        </div>
        <Link href="/admin/businesses/new">
          <Button className="bg-[oklch(0.55_0.2_25)] hover:bg-[oklch(0.5_0.2_25)]">
            <Plus className="h-4 w-4 mr-2" />
            Onboard New Business
          </Button>
        </Link>
      </div>

      <Card className="border-border">
        <CardContent className="p-0">
          <div className="rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 border-b border-border">
                <tr>
                  <th className="text-left px-6 py-4 font-medium text-muted-foreground">Business</th>
                  <th className="text-left px-6 py-4 font-medium text-muted-foreground">Phone</th>
                  <th className="text-left px-6 py-4 font-medium text-muted-foreground">Plan</th>
                  <th className="text-left px-6 py-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-6 py-4 font-medium text-muted-foreground">Joined</th>
                  <th className="text-left px-6 py-4 font-medium text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(businesses ?? []).map((b) => (
                  <tr key={b.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium">{b.name}</p>
                        <p className="text-xs text-muted-foreground">{b.slug}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{b.phone_number ?? "—"}</td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="capitalize">{b.plan ?? "growth"}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={b.is_active ? "bg-green-600 hover:bg-green-600" : ""} variant={b.is_active ? "default" : "secondary"}>
                        {b.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {new Date(b.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/admin/businesses/${b.slug}`}>
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
                {(businesses ?? []).length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                      No businesses yet.{" "}
                      <Link href="/admin/businesses/new" className="underline">
                        Onboard your first business
                      </Link>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
