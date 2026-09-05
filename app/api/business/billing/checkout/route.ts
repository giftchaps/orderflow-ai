import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { apiError, apiRequireSession, ApiError } from "@/lib/auth/guards"
import { canInBusiness } from "@/lib/auth/session"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getStripe } from "@/lib/stripe"
import { priceIdForPlan } from "@/lib/plans"
import { getAppUrl } from "@/lib/env"
import { PLAN_IDS, type PlanId } from "@/lib/business-shared"

export const dynamic = "force-dynamic"

const bodySchema = z.object({
  plan: z.enum(PLAN_IDS),
})

/**
 * POST /api/business/billing/checkout  { plan }
 * Owner-only. Creates (or reuses) a Stripe customer for the active business,
 * then a Checkout Session for the requested plan, and returns the hosted URL
 * to redirect the browser to — card details are entered on Stripe's own page,
 * never in this app.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await apiRequireSession()
    const businessId = session.activeBusinessId
    if (!businessId) throw new ApiError(400, "No active business for this account.")
    if (!canInBusiness(session, businessId, "billing.manage")) {
      throw new ApiError(403, "Only an owner can manage billing.")
    }

    const parsed = bodySchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) throw new ApiError(400, "A valid plan is required.")
    const plan = parsed.data.plan as PlanId

    const supabase = createSupabaseServerClient()
    const { data: business, error } = await supabase
      .from("businesses")
      .select("id, name, owner_email, stripe_customer_id")
      .eq("id", businessId)
      .maybeSingle()
    if (error) throw new ApiError(500, error.message)
    if (!business) throw new ApiError(404, "Business not found.")

    // Resolve the price before creating a Stripe customer, so a plan that
    // isn't set up yet in Admin -> Plans fails fast without leaving behind
    // an unused Stripe customer.
    const priceId = await priceIdForPlan(plan)

    const stripe = getStripe()
    let customerId = business.stripe_customer_id as string | null

    if (!customerId) {
      const customer = await stripe.customers.create({
        name: business.name,
        email: business.owner_email ?? session.user.email ?? undefined,
        metadata: { business_id: businessId },
      })
      customerId = customer.id
      const { error: saveErr } = await supabase
        .from("businesses")
        .update({ stripe_customer_id: customerId })
        .eq("id", businessId)
      if (saveErr) throw new ApiError(500, saveErr.message)
    }

    const appUrl = getAppUrl(req.nextUrl.origin)
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/business/settings?billing=success`,
      cancel_url: `${appUrl}/business/settings?billing=cancelled`,
      client_reference_id: businessId,
      metadata: { business_id: businessId, plan },
      subscription_data: { metadata: { business_id: businessId, plan } },
    })

    if (!checkoutSession.url) throw new ApiError(500, "Stripe did not return a checkout URL.")
    return NextResponse.json({ ok: true, url: checkoutSession.url })
  } catch (error) {
    return apiError(error)
  }
}
