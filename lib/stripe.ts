import "server-only"

import Stripe from "stripe"

let cached: Stripe | null = null

/** Lazily-created Stripe client. Throws a clear error if billing isn't configured yet. */
export function getStripe(): Stripe {
  if (cached) return cached
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error("Billing is not configured (STRIPE_SECRET_KEY is not set).")
  cached = new Stripe(key)
  return cached
}

export function billingConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY)
}

// Which Stripe Price id each plan charges, and the reverse lookup, are no
// longer env vars -- they live on the plan_tiers table so an admin can
// change them from Admin -> Plans without a redeploy. See lib/plans.ts
// (priceIdForPlan / planForPriceId).
