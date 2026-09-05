import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { apiError, apiRequireBusiness, apiRequireSession, ApiError } from "@/lib/auth/guards"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { logAudit } from "@/lib/audit"
import { pushVapiPrompt } from "@/lib/vapi-prompt"

const menuItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  aliases: z.array(z.string()).optional(),
  description: z.string().optional(),
  active: z.boolean().optional(),
  prices: z.record(z.string(), z.number()).optional(),
})

const menuBodySchema = z.object({
  menu: z.object({
    categories: z.array(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1),
        items: z.array(menuItemSchema),
      })
    ),
  }),
})

/** PUT /api/business/menu  { menu } — saves the menu for the caller's active business. */
export async function PUT(req: NextRequest) {
  try {
    const session = await apiRequireSession()
    const businessId = session.activeBusinessId
    if (!businessId) throw new ApiError(400, "No active business for this account.")
    await apiRequireBusiness(businessId, "menu.edit")

    const parsed = menuBodySchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) throw new ApiError(400, parsed.error.issues.map((i) => i.message).join(" "))
    const menu = parsed.data.menu

    const supabase = createSupabaseServerClient()

    let { data: biz, error: bizErr } = await supabase
      .from("businesses")
      .select("name, vapi_assistant_id, ai_greeting, multilingual")
      .eq("id", businessId)
      .single()
    if (bizErr && /column/i.test(bizErr.message)) {
      // Legacy DB that hasn't run the greeting/multilingual migration yet.
      ;({ data: biz, error: bizErr } = await supabase
        .from("businesses")
        .select("name, vapi_assistant_id")
        .eq("id", businessId)
        .single())
    }
    if (bizErr || !biz) throw new ApiError(404, "Business not found.")

    const { error: updateErr } = await supabase.from("businesses").update({ menu }).eq("id", businessId)
    if (updateErr) throw new ApiError(500, updateErr.message)

    await pushVapiPrompt({
      name: biz.name,
      menu,
      ai_greeting: biz.ai_greeting,
      multilingual: biz.multilingual,
      vapi_assistant_id: biz.vapi_assistant_id,
    })

    await logAudit({
      action: "menu.saved",
      session,
      businessId,
      targetType: "business",
      targetId: businessId,
      metadata: { categories: menu.categories.length },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return apiError(error)
  }
}
