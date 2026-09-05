import "server-only"

import Stripe from "stripe"
import type { PlanId } from "@/lib/business-shared"
import { PLANS } from "@/lib/business-shared"

let cached: Stripe | null = null

/** Lazily-created Stripe client. Throws a clear error if billing isn't configured yet. */
export function getStripe(): Stripe {
  if (cached) return cached
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error("Billing is not configured (STRIPE_SECRET_KEY is not set).")
  cached = new Stripe(key)
  return cached
}

/** Maps our internal plan ids to the Stripe Price id each one charges. */
function planPriceEnv(): Record<PlanId, string | undefined> {
  return {
    starter: process.env.STRIPE_PRICE_STARTER || undefined,
    growth: process.env.STRIPE_PRICE_GROWTH || undefined,
    pro: process.env.STRIPE_PRICE_PRO || undefined,
  }
}

export function priceIdForPlan(plan: PlanId): string {
  const id = planPriceEnv()[plan]
  if (!id) throw new Error(`No Stripe price is configured for the "${plan}" plan (set STRIPE_PRICE_${plan.toUpperCase()}).`)
  return id
}

/** Reverse lookup used by the webhook to figure out which plan a subscription's price maps to. */
export function planForPriceId(priceId: string): PlanId | null {
  const env = planPriceEnv()
  for (const plan of PLANS.map((p) => p.id)) {
    if (env[plan] === priceId) return plan
  }
  return null
}

export function billingConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY)
}
