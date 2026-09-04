import { createSupabaseServerClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { MessageSquare } from "lucide-react"

export default async function DemoRequestsPage() {
  const supabase = createSupabaseServerClient()
  const { data: requests } = await supabase
    .from("demo_requests")
    .select("id, name, email, business_name, phone, message, created_at")
    .order("created_at", { ascending: false })

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Demo Requests</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {requests?.length ?? 0} lead{(requests?.length ?? 0) !== 1 ? "s" : ""} from the marketing site
          </p>
        </div>
        <div className="h-10 w-10 rounded-lg bg-[oklch(0.55_0.2_25)]/10 flex items-center justify-center">
          <MessageSquare className="h-5 w-5 text-[oklch(0.55_0.2_25)]" />
        </div>
      </div>

      <Card className="border-border">
        <CardContent className="p-0">
          <div className="rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 border-b border-border">
                <tr>
                  <th className="text-left px-6 py-4 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-6 py-4 font-medium text-muted-foreground">Business</th>
                  <th className="text-left px-6 py-4 font-medium text-muted-foreground">Email</th>
                  <th className="text-left px-6 py-4 font-medium text-muted-foreground">Phone</th>
                  <th className="text-left px-6 py-4 font-medium text-muted-foreground">Message</th>
                  <th className="text-left px-6 py-4 font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(requests ?? []).map((req) => (
                  <tr key={req.id} className="hover:bg-secondary/20 transition-colors align-top">
                    <td className="px-6 py-4 font-medium">{req.name}</td>
                    <td className="px-6 py-4">{req.business_name}</td>
                    <td className="px-6 py-4">
                      <a href={`mailto:${req.email}`} className="text-[oklch(0.55_0.2_25)] hover:underline">
                        {req.email}
                      </a>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{req.phone ?? "—"}</td>
                    <td className="px-6 py-4 text-muted-foreground max-w-xs">
                      <span className="line-clamp-2">{req.message ?? "—"}</span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                      <div>{new Date(req.created_at).toLocaleDateString()}</div>
                      <div className="text-xs">{new Date(req.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</div>
                    </td>
                  </tr>
                ))}
                {(requests ?? []).length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-muted-foreground">
                      No demo requests yet. They will appear here when someone submits the form on the marketing site.
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
