import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { apiError, apiRequirePlatformAdmin, ApiError } from "@/lib/auth/guards"
import { fetchPlanTier, updatePlanTier } from "@/lib/plans"
import { logAudit } from "@/lib/audit"
import { PLAN_IDS, type PlanId } from "@/lib/business-shared"

export const dynamic = "force-dynamic"

const patchSchema = z.object({
  label: z.string().trim().min(1).max(60).optional(),
  priceCents: z.number().int().min(0).max(10_000_00).optional(),
  monthlyOrderLimit: z.number().int().min(1).nullable().optional(),
  staffSeatLimit: z.number().int().min(1).nullable().optional(),
  prioritySupport: z.boolean().optional(),
  stripePriceId: z.string().trim().max(200).nullable().optional(),
})

/**
 * PATCH /api/admin/plans/[planId]  { label?, priceCents?, monthlyOrderLimit?,
 * staffSeatLimit?, prioritySupport?, stripePriceId? }
 * Platform-admin-only. Edits the shared plan_tiers row every business on that
 * plan is priced and limited by — see Admin -> Plans.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ planId: string }> }) {
  try {
    const session = await apiRequirePlatformAdmin()
    const { planId } = await params
    if (!(PLAN_IDS as readonly string[]).includes(planId)) throw new ApiError(404, "Unknown plan.")

    const parsed = patchSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) throw new ApiError(400, parsed.error.issues.map((i) => i.message).join(" "))
    if (Object.keys(parsed.data).length === 0) throw new ApiError(400, "No changes provided.")

    const stripePriceId =
      typeof parsed.data.stripePriceId === "string" && parsed.data.stripePriceId.trim() === ""
        ? null
        : parsed.data.stripePriceId

    await updatePlanTier(planId as PlanId, { ...parsed.data, stripePriceId })

    await logAudit({
      action: "plan_tier.updated",
      session,
      targetType: "plan_tier",
      targetId: planId,
      metadata: parsed.data,
    })

    const tier = await fetchPlanTier(planId as PlanId)
    return NextResponse.json({ ok: true, tier })
  } catch (error) {
    return apiError(error)
  }
}
