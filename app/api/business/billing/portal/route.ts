import { NextRequest, NextResponse } from "next/server"
import { apiError, apiRequireSession, ApiError } from "@/lib/auth/guards"
import { canInBusiness } from "@/lib/auth/session"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getStripe } from "@/lib/stripe"
import { getAppUrl } from "@/lib/env"

export const dynamic = "force-dynamic"

/**
 * POST /api/business/billing/portal
 * Owner-only. Opens Stripe's hosted Billing Portal for the active business's
 * Stripe customer, where they can update their card, view invoices, or cancel
 * — none of that lives in this app.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await apiRequireSession()
    const businessId = session.activeBusinessId
    if (!businessId) throw new ApiError(400, "No active business for this account.")
    if (!canInBusiness(session, businessId, "billing.manage")) {
      throw new ApiError(403, "Only an owner can manage billing.")
    }

    const supabase = createSupabaseServerClient()
    const { data: business, error } = await supabase
      .from("businesses")
      .select("stripe_customer_id")
      .eq("id", businessId)
      .maybeSingle()
    if (error) throw new ApiError(500, error.message)
    if (!business?.stripe_customer_id) throw new ApiError(400, "This business hasn't subscribed yet.")

    const portalSession = await getStripe().billingPortal.sessions.create({
      customer: business.stripe_customer_id,
      return_url: `${getAppUrl(req.nextUrl.origin)}/business/settings`,
    })

    return NextResponse.json({ ok: true, url: portalSession.url })
  } catch (error) {
    return apiError(error)
  }
}
