import { NextRequest, NextResponse } from "next/server"
import type Stripe from "stripe"
import { getStripe, planForPriceId } from "@/lib/stripe"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { logAudit } from "@/lib/audit"

export const dynamic = "force-dynamic"

/**
 * POST /api/webhooks/stripe — subscription lifecycle events from Stripe.
 *
 * Verifies the `stripe-signature` header against STRIPE_WEBHOOK_SECRET before
 * touching anything (same pattern as the Vapi voice webhook's HMAC check in
 * backend/main.py) — an unsigned or mis-signed request is rejected outright.
 * Reads the body with `.text()`, not `.json()`, because signature
 * verification needs the exact raw bytes Stripe signed.
 *
 * We deliberately only sync `subscription_status` here and never touch
 * `businesses.status` (active/suspended) automatically — a canceled or
 * past_due subscription shows up clearly in the admin console, but pausing
 * a business's phone agent is left to a human clicking Suspend, so a
 * momentary card decline can't take a live kitchen offline on its own.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    console.error("[stripe webhook] STRIPE_WEBHOOK_SECRET is not set — rejecting request.")
    return NextResponse.json({ error: "Webhook not configured." }, { status: 500 })
  }

  const signature = req.headers.get("stripe-signature")
  if (!signature) return NextResponse.json({ error: "Missing signature." }, { status: 400 })

  const rawBody = await req.text()
  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, secret)
  } catch (err) {
    console.error("[stripe webhook] signature verification failed:", err)
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const businessId = session.metadata?.business_id ?? session.client_reference_id ?? null
        if (!businessId || typeof session.subscription !== "string") break

        const subscription = await getStripe().subscriptions.retrieve(session.subscription)
        await syncSubscription(businessId, subscription)
        await logAudit({
          action: "business.subscription_started",
          actorType: "system",
          businessId,
          targetType: "business",
          targetId: businessId,
          metadata: { subscriptionId: subscription.id, status: subscription.status },
        })
        break
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        const businessId = await businessIdForSubscription(subscription)
        if (!businessId) break

        await syncSubscription(businessId, subscription)
        await logAudit({
          action: "business.subscription_updated",
          actorType: "system",
          businessId,
          targetType: "business",
          targetId: businessId,
          metadata: { subscriptionId: subscription.id, status: subscription.status },
        })
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        const businessId = await businessIdForSubscription(subscription)
        if (!businessId) break

        const supabase = createSupabaseServerClient()
        const { error } = await supabase
          .from("businesses")
          .update({ subscription_status: "canceled" })
          .eq("id", businessId)
        if (error) console.error("[stripe webhook] failed to mark subscription canceled:", error.message)

        await logAudit({
          action: "business.subscription_canceled",
          actorType: "system",
          businessId,
          targetType: "business",
          targetId: businessId,
          metadata: { subscriptionId: subscription.id },
        })
        break
      }

      default:
        break
    }
  } catch (err) {
    // Stripe retries on a non-2xx response. A bug in our own handling of a
    // valid, signed event shouldn't turn into an endless retry loop for the
    // same payload — log it for us to investigate and acknowledge receipt.
    console.error(`[stripe webhook] failed to process ${event.type}:`, err)
  }

  return NextResponse.json({ received: true })
}

async function businessIdForSubscription(subscription: Stripe.Subscription): Promise<string | null> {
  if (subscription.metadata?.business_id) return subscription.metadata.business_id
  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from("businesses")
    .select("id")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle()
  return data?.id ?? null
}

async function syncSubscription(businessId: string, subscription: Stripe.Subscription) {
  const supabase = createSupabaseServerClient()
  const item = subscription.items.data[0]
  const priceId = item?.price?.id
  const plan = priceId ? planForPriceId(priceId) : null
  const currentPeriodEnd = item?.current_period_end ? new Date(item.current_period_end * 1000).toISOString() : null
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id

  const updates: Record<string, unknown> = {
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    subscription_status: subscription.status,
    current_period_end: currentPeriodEnd,
  }
  if (plan) updates.plan = plan

  const { error } = await supabase.from("businesses").update(updates).eq("id", businessId)
  if (error) console.error("[stripe webhook] failed to update business", businessId, error.message)
}
