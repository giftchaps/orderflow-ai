import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { z } from "zod"
import { apiError, apiRequireSession, ApiError } from "@/lib/auth/guards"
import { can } from "@/lib/auth/permissions"

const MAX_BYTES = 10 * 1024 * 1024

const menuSchema = z.object({
  categories: z.array(
    z.object({
      name: z.string().min(1),
      items: z.array(
        z.object({
          name: z.string().min(1),
          description: z.string().optional(),
          aliases: z.array(z.string()).optional(),
          active: z.boolean().optional(),
          prices: z.record(z.string(), z.number()).optional(),
        })
      ),
    })
  ),
})

/**
 * POST /api/menu/extract  (multipart: image)
 * Vision-extract a menu photo into the MenuDocument shape.
 * Allowed for platform admins and any member with menu.edit in at least one business.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await apiRequireSession()
    const allowed = session.isPlatformAdmin || session.memberships.some((m) => can(m.role, "menu.edit"))
    if (!allowed) throw new ApiError(403, "You do not have permission to edit menus.")

    if (!process.env.OPENAI_API_KEY) throw new ApiError(503, "Menu extraction is not configured (OPENAI_API_KEY).")

    const formData = await req.formData()
    const image = formData.get("image")
    if (!(image instanceof File)) throw new ApiError(400, "No image provided.")
    if (image.size > MAX_BYTES) throw new ApiError(413, "Image must be under 10MB.")
    if (!image.type.startsWith("image/")) throw new ApiError(415, "File must be an image.")

    const base64 = Buffer.from(await image.arrayBuffer()).toString("base64")
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 4096,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Extract the menu from this image as JSON: {"categories":[{"name":string,"items":[{"name":string,"description"?:string,"aliases":string[],"active":true,"prices":{[size:string]:number}}]}]}.
Rules: extract every visible item with exact names; fill prices when visible otherwise 0; for sandwiches/subs use price keys hard_roll_6inch, wrap, 12inch; for everything else use "regular". Return only JSON.`,
            },
            { type: "image_url", image_url: { url: `data:${image.type};base64,${base64}`, detail: "high" } },
          ],
        },
      ],
    })

    const raw = response.choices[0]?.message?.content ?? ""
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
    let parsed: unknown
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      throw new ApiError(422, "Could not read a menu from that image. Try a clearer photo.")
    }
    const menu = menuSchema.safeParse(parsed)
    if (!menu.success) throw new ApiError(422, "The extracted menu was malformed. Try again or enter items manually.")

    return NextResponse.json({ ok: true, ...menu.data })
  } catch (error) {
    return apiError(error)
  }
}
