import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { apiError, apiRequirePlatformAdmin, ApiError } from "@/lib/auth/guards"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { normalizeEmail } from "@/lib/auth/normalize-email"
import { inviteStaff } from "@/lib/invitations"
import { logAudit } from "@/lib/audit"
import { PLAN_IDS, SLUG_RE, slugify } from "@/lib/business"

const menuItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  aliases: z.array(z.string()).optional(),
  description: z.string().optional(),
  active: z.boolean().optional(),
  prices: z.record(z.string(), z.number().nonnegative()).optional(),
})

const menuSchema = z.object({
  categories: z.array(z.object({ id: z.string().optional(), name: z.string().min(1), items: z.array(menuItemSchema) })),
})

export const onboardSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().toLowerCase().regex(SLUG_RE, "Slug may only contain lowercase letters, numbers and hyphens."),
  address: z.string().trim().max(240).optional().or(z.literal("")),
  timezone: z.string().trim().min(1).default("America/New_York"),
  prep_time_minutes: z.coerce.number().int().min(1).max(240).default(15),
  plan: z.enum(PLAN_IDS).default("starter"),
  owner_name: z.string().trim().max(120).optional().or(z.literal("")),
  owner_email: z.string().trim().email(),
  menu: menuSchema.nullable().optional(),
  /** When true, create the business but do not send the owner invite yet. */
  defer_invite: z.boolean().optional(),
})

export type OnboardInput = z.infer<typeof onboardSchema>

/**
 * POST /api/admin/onboard — create a tenant.
 * Creates the business (status "invited" or "draft"), the owner staff row, and
 * sends the owner invite. Returns { business_id, slug, invite_sent, warning? }.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await apiRequirePlatformAdmin()
    const parsed = onboardSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "))
    }
    const input = parsed.data
    const ownerEmail = normalizeEmail(input.owner_email)
    if (!ownerEmail) throw new ApiError(400, "A valid owner email is required.")
    const slug = input.slug || slugify(input.name)
    const supabase = createSupabaseServerClient()

    const { data: slugTaken } = await supabase.from("businesses").select("id").eq("slug", slug).maybeSingle()
    if (slugTaken) throw new ApiError(409, "That slug is already taken.")

    const { data: dup } = await supabase
      .from("businesses")
      .select("id")
      .eq("owner_email", ownerEmail)
      .ilike("name", input.name)
      .maybeSingle()
    if (dup) throw new ApiError(409, "A business with this name and owner already exists.")

    const status = input.defer_invite ? "draft" : "invited"
    const { data: biz, error: bizErr } = await supabase
      .from("businesses")
      .insert({
        name: input.name,
        slug,
        address: input.address || null,
        timezone: input.timezone,
        prep_time_minutes: input.prep_time_minutes,
        plan: input.plan,
        owner_email: ownerEmail,
        menu: input.menu ?? null,
        status,
        is_active: false,
      })
      .select("id, slug")
      .single()
    if (bizErr || !biz) throw new ApiError(500, bizErr?.message ?? "Failed to create business.")

    await logAudit({
      action: "business.created",
      session,
      businessId: biz.id,
      targetType: "business",
      targetId: biz.id,
      metadata: { businessName: input.name, slug, plan: input.plan, ownerEmail },
    })

    let inviteSent = false
    let warning: string | undefined

    if (input.defer_invite) {
      // Create the owner row without emailing.
      await supabase.from("businesses_staff").insert({
        business_id: biz.id,
        email: ownerEmail,
        name: input.owner_name || null,
        role: "owner",
        status: "invited",
        invited_by: session.user.id,
      })
    } else {
      try {
        const result = await inviteStaff({
          businessId: biz.id,
          email: ownerEmail,
          name: input.owner_name || null,
          role: "owner",
          invitedBy: session.user.id,
          origin: req.nextUrl.origin,
        })
        inviteSent = result.emailSent
        warning = result.warning
        if (result.linkedExisting) {
          await supabase.from("businesses").update({ status: "active", activated_at: new Date().toISOString() }).eq("id", biz.id)
        }
        await logAudit({
          action: "staff.invited",
          session,
          businessId: biz.id,
          targetType: "staff",
          targetId: result.staffId,
          metadata: { email: ownerEmail, role: "owner", emailSent: result.emailSent },
        })
      } catch (err) {
        warning = `Business created but the owner invite failed: ${err instanceof Error ? err.message : "unknown error"}`
      }
    }

    return NextResponse.json({ ok: true, business_id: biz.id, slug: biz.slug, invite_sent: inviteSent, warning })
  } catch (error) {
    return apiError(error)
  }
}
