import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { apiError, apiRequireBusiness, apiRequireSession, ApiError } from "@/lib/auth/guards"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getServerEnv } from "@/lib/env"
import { logAudit } from "@/lib/audit"
import type { MenuDocument } from "@/lib/business-shared"

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

function buildSystemPrompt(businessName: string, menu: MenuDocument): string {
  const categories = menu?.categories ?? []
  let menuText = ""
  for (const cat of categories) {
    menuText += `\n## ${cat.name}\n`
    for (const item of cat.items ?? []) {
      if (item.active === false) continue
      const aliases = item.aliases?.length ? ` (also called: ${item.aliases.join(", ")})` : ""
      const desc = item.description ? ` — ${item.description}` : ""
      const prices: string[] = []
      if (item.prices?.hard_roll_6inch) prices.push(`6" $${item.prices.hard_roll_6inch}`)
      if (item.prices?.wrap) prices.push(`Wrap $${item.prices.wrap}`)
      if (item.prices?.["12inch"]) prices.push(`12" $${item.prices["12inch"]}`)
      if (item.prices?.regular) prices.push(`$${item.prices.regular}`)
      const priceStr = prices.length ? ` [${prices.join(", ")}]` : ""
      menuText += `- ${item.name}${aliases}${desc}${priceStr}\n`
    }
  }

  return `You are an AI ordering assistant for ${businessName}. Your job is to take food orders over the phone.

When a customer calls:
1. Greet them warmly and ask what they'd like to order
2. Take their complete order, asking about bread type for sandwiches (Hard Roll/6-inch, 12-inch Sub, Plain Wrap, Spinach Wrap, or Whole Wheat Wrap)
3. Ask about any special instructions or modifications
4. Confirm the full order back to the customer
5. Tell them their order number and estimated pickup time

MENU:
${menuText}

Rules:
- Only take orders for items on the menu
- If an item is not on the menu, politely let the customer know
- Always confirm the bread/wrap choice for sandwiches
- Be friendly, efficient, and accurate
- If you cannot understand an item, ask the customer to repeat it`
}

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

    const { data: biz, error: bizErr } = await supabase
      .from("businesses")
      .select("name, vapi_assistant_id")
      .eq("id", businessId)
      .single()
    if (bizErr || !biz) throw new ApiError(404, "Business not found.")

    const { error: updateErr } = await supabase.from("businesses").update({ menu }).eq("id", businessId)
    if (updateErr) throw new ApiError(500, updateErr.message)

    const { VAPI_API_KEY } = getServerEnv()
    if (VAPI_API_KEY && biz.vapi_assistant_id) {
      const systemPrompt = buildSystemPrompt(biz.name, menu)
      try {
        await fetch(`https://api.vapi.ai/assistant/${biz.vapi_assistant_id}`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${VAPI_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: { provider: "openai", model: "gpt-4o", messages: [{ role: "system", content: systemPrompt }] },
          }),
        })
      } catch (vapiErr) {
        console.error("[business/menu] Vapi update failed:", vapiErr)
        // Don't fail the request if the Vapi push fails — the menu is already saved.
      }
    }

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
