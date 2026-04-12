import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

function buildSystemPrompt(businessName: string, menu: any): string {
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

export async function PUT(req: NextRequest) {
  try {
    const { business_id, menu } = await req.json()
    if (!business_id || !menu) {
      return NextResponse.json({ error: "business_id and menu are required" }, { status: 400 })
    }

    const supabase = createSupabaseServerClient()

    // Fetch business name and vapi_assistant_id
    const { data: biz, error: bizErr } = await supabase
      .from("businesses")
      .select("name, vapi_assistant_id")
      .eq("id", business_id)
      .single()

    if (bizErr || !biz) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 })
    }

    // Save menu to Supabase
    const { error: updateErr } = await supabase
      .from("businesses")
      .update({ menu })
      .eq("id", business_id)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    // Regenerate Vapi assistant system prompt if configured
    const vapiApiKey = process.env.VAPI_API_KEY
    if (vapiApiKey && biz.vapi_assistant_id) {
      const systemPrompt = buildSystemPrompt(biz.name, menu)
      try {
        await fetch(`https://api.vapi.ai/assistant/${biz.vapi_assistant_id}`, {
          method: "PATCH",
          headers: {
            "Authorization": `Bearer ${vapiApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: {
              provider: "openai",
              model: "gpt-4o",
              messages: [{ role: "system", content: systemPrompt }],
            },
          }),
        })
      } catch (vapiErr) {
        console.error("[business/menu] Vapi update failed:", vapiErr)
        // Don't fail the request if Vapi update fails
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error("[business/menu]", err)
    return NextResponse.json({ error: err.message ?? "Internal error" }, { status: 500 })
  }
}
