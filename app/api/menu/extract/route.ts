import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { z } from "zod"
import { apiError, apiRequireSession, ApiError } from "@/lib/auth/guards"
import { can } from "@/lib/auth/permissions"

const MAX_BYTES = 10 * 1024 * 1024
const MAX_IMAGES = 8

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
    // Accept either multiple "images" entries (a menu that spans several photos —
    // front/back, or multiple pages) or the legacy single "image" field, so old
    // clients and the multi-file picker both work against this route.
    const images = [...formData.getAll("images"), ...formData.getAll("image")].filter(
      (v): v is File => v instanceof File
    )
    if (images.length === 0) throw new ApiError(400, "No image provided.")
    if (images.length > MAX_IMAGES) throw new ApiError(400, `Upload at most ${MAX_IMAGES} photos at a time.`)
    for (const image of images) {
      if (image.size > MAX_BYTES) throw new ApiError(413, "Each image must be under 10MB.")
      if (!image.type.startsWith("image/")) throw new ApiError(415, "All files must be images.")
    }

    const imageBlocks = await Promise.all(
      images.map(async (image) => {
        const base64 = Buffer.from(await image.arrayBuffer()).toString("base64")
        return {
          type: "image_url" as const,
          image_url: { url: `data:${image.type};base64,${base64}`, detail: "high" as const },
        }
      })
    )
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const multiPageNote =
      images.length > 1
        ? ` These ${images.length} images are pages or sections of the same menu (in the order provided) — merge them into ONE unified list of categories. Don't create duplicate categories or items for the same thing shown across two photos (e.g. a category heading that continues onto the next page); combine them under a single category instead.`
        : ""

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
              text: `Extract the menu from ${images.length > 1 ? "these images" : "this image"} as JSON: {"categories":[{"name":string,"items":[{"name":string,"description"?:string,"aliases":string[],"active":true,"prices":{[size:string]:number}}]}]}.
Rules: extract every visible item with exact names; fill prices when visible otherwise 0; for sandwiches/subs use price keys hard_roll_6inch, wrap, 12inch; for everything else use "regular". Return only JSON.${multiPageNote}`,
            },
            ...imageBlocks,
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
