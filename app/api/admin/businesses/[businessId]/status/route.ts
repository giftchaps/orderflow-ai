import { NextRequest, NextResponse } from "next/server"
import { apiError, apiRequirePlatformAdmin, ApiError } from "@/lib/auth/guards"
import { businessStatusSchema, setBusinessStatus } from "@/lib/business-mutations"

/**
 * POST /api/admin/businesses/:id/status  { status: "active" | "suspended" | "invited" | "draft", reason? }
 * Lifecycle transitions. Suspending pauses ingest + the display; activating resumes them.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ businessId: string }> }) {
  try {
    const session = await apiRequirePlatformAdmin()
    const { businessId } = await params
    const parsed = businessStatusSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw new ApiError(400, "status must be one of draft, invited, active, suspended.")

    await setBusinessStatus(session, businessId, parsed.data.status, parsed.data.reason)
    return NextResponse.json({ ok: true, status: parsed.data.status })
  } catch (error) {
    return apiError(error)
  }
}
