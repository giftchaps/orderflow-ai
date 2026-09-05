import "server-only"

import { getServerEnv } from "@/lib/env"
import type { MenuDocument } from "@/lib/business-shared"

/**
 * Builds and pushes the live Vapi assistant's system prompt. Pulled out of
 * app/api/business/menu/route.ts (the only place this used to happen) so
 * every mutation that can affect what the assistant should say — a menu
 * save, a greeting change, turning on multilingual mode, or wiring up a
 * business's assistant id for the first time — re-pushes the prompt the
 * same way, instead of each caller needing to remember to.
 */
export type PromptBusiness = {
  name: string
  menu: MenuDocument | null
  ai_greeting?: string | null
  multilingual?: boolean | null
}

export function buildSystemPrompt(business: PromptBusiness): string {
  const { name: businessName, menu, ai_greeting, multilingual } = business
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

  const greetingStep = ai_greeting?.trim()
    ? `Open the call with this exact greeting, adapted only as needed for natural phone delivery: "${ai_greeting.trim()}"`
    : `Greet them warmly and ask what they'd like to order`

  const languageBlock = multilingual
    ? `\n\nLANGUAGE: Detect the language the caller speaks from their first words and continue the ENTIRE conversation in that language — greeting, menu, confirmation, everything. If the caller mixes two languages within the same sentence or order (for example, Spanish and English), respond naturally in that same mixed style rather than forcing one language. You are fluent in English, Spanish, French, German, Hindi, Russian, Portuguese, Japanese, Italian, and Dutch — these are the languages this system understands reliably, so hold the conversation confidently in whichever one the caller uses. For any other language, do your best but let the caller know you may need to confirm details more carefully.`
    : ""

  return `You are an AI ordering assistant for ${businessName}. Your job is to take food orders over the phone.

When a customer calls:
1. ${greetingStep}
2. Take their complete order, asking about bread type for sandwiches (Hard Roll/6-inch, 12-inch Sub, Plain Wrap, Spinach Wrap, or Whole Wheat Wrap)
3. Ask about any special instructions or modifications
4. Confirm the full order back to the customer
5. Tell them their order number and estimated pickup time

MENU:
${menuText}
${languageBlock}

Rules:
- Only take orders for items on the menu
- If an item is not on the menu, politely let the customer know
- Always confirm the bread/wrap choice for sandwiches
- Be friendly, efficient, and accurate
- If you cannot understand an item, ask the customer to repeat it`
}

/**
 * PATCHes the business's live Vapi assistant with a freshly built prompt.
 * No-ops quietly (same as before) if VAPI_API_KEY isn't set or the business
 * has no assistant wired up yet — never throws, since a Vapi push failing
 * should never block the caller's own save.
 *
 * Only sets `transcriber` when multilingual is turned ON, and never touches
 * it otherwise — so disabling multilingual mode leaves whatever transcriber
 * the business was already using untouched, rather than guessing a
 * "default" to revert to.
 */
export async function pushVapiPrompt(business: PromptBusiness & { vapi_assistant_id: string | null }): Promise<void> {
  const { VAPI_API_KEY } = getServerEnv()
  if (!VAPI_API_KEY || !business.vapi_assistant_id) return

  const body: Record<string, unknown> = {
    model: { provider: "openai", model: "gpt-4o", messages: [{ role: "system", content: buildSystemPrompt(business) }] },
  }
  if (business.multilingual) {
    body.transcriber = { provider: "deepgram", model: "nova-3", language: "multi" }
  }

  try {
    const res = await fetch(`https://api.vapi.ai/assistant/${business.vapi_assistant_id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${VAPI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      // Previously unchecked — a rejected PATCH (bad transcriber field,
      // invalid assistant id, plan restriction, etc.) looked identical to a
      // successful one from the caller's side. Surface it in server logs so
      // "I turned on multilingual but it's not working" is debuggable.
      const detail = await res.text().catch(() => "")
      console.error(
        `[vapi-prompt] Vapi rejected the assistant update (HTTP ${res.status}) for ` +
        `assistant ${business.vapi_assistant_id}: ${detail.slice(0, 500)}`
      )
    }
  } catch (err) {
    console.error("[vapi-prompt] push failed:", err)
  }
}
