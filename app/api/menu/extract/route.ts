import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import type { ChatCompletionContentPart } from "openai/resources/chat/completions"
import mammoth from "mammoth"
import { z } from "zod"
import { apiError, apiRequireSession, ApiError } from "@/lib/auth/guards"
import { can } from "@/lib/auth/permissions"

const MAX_BYTES = 10 * 1024 * 1024
const MAX_FILES = 8

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
const LEGACY_DOC_MIME = "application/msword"

function extOf(filename: string) {
  const i = filename.lastIndexOf(".")
  return i === -1 ? "" : filename.slice(i + 1).toLowerCase()
}

type Classified =
  | { kind: "image"; file: File }
  | { kind: "pdf"; file: File }
  | { kind: "docx"; file: File }
  | { kind: "text"; file: File }

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
 * POST /api/menu/extract  (multipart: files)
 * Extract a menu from any mix of photos, PDFs, and Word documents into the
 * MenuDocument shape. Photos and PDFs go to GPT-4o as vision/file input;
 * Word docs (and plain text/CSV) are converted to text first — there's
 * nothing for a vision model to look at in a .docx, it's just a zipped XML
 * document, so we extract its text with mammoth instead of feeding the raw
 * file to the model. Everything is combined into a single extraction call
 * so a menu split across several files (e.g. a PDF price list plus a couple
 * of photos of specials) still comes back as one merged menu.
 * Allowed for platform admins and any member with menu.edit in at least one business.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await apiRequireSession()
    const allowed = session.isPlatformAdmin || session.memberships.some((m) => can(m.role, "menu.edit"))
    if (!allowed) throw new ApiError(403, "You do not have permission to edit menus.")

    if (!process.env.OPENAI_API_KEY) throw new ApiError(503, "Menu extraction is not configured (OPENAI_API_KEY).")

    const formData = await req.formData()
    // "files" is the current field name; "images"/"image" are accepted too so
    // older clients that only ever sent photos keep working unchanged.
    const files = [...formData.getAll("files"), ...formData.getAll("images"), ...formData.getAll("image")].filter(
      (v): v is File => v instanceof File
    )
    if (files.length === 0) throw new ApiError(400, "No file provided.")
    if (files.length > MAX_FILES) throw new ApiError(400, `Upload at most ${MAX_FILES} files at a time.`)

    const classified: Classified[] = files.map((file) => {
      if (file.size > MAX_BYTES) throw new ApiError(413, `"${file.name}" is over the 10MB limit.`)
      const ext = extOf(file.name)
      if (file.type.startsWith("image/")) return { kind: "image", file }
      if (file.type === "application/pdf" || ext === "pdf") return { kind: "pdf", file }
      if (file.type === DOCX_MIME || ext === "docx") return { kind: "docx", file }
      if (file.type === LEGACY_DOC_MIME || ext === "doc") {
        throw new ApiError(415, `"${file.name}" is an old .doc file — please re-save it as .docx or PDF and try again.`)
      }
      if (file.type.startsWith("text/") || ext === "txt" || ext === "csv") return { kind: "text", file }
      throw new ApiError(415, `"${file.name}" isn't a supported file type. Upload photos, PDFs, or Word (.docx) documents.`)
    })

    const imageBlocks: ChatCompletionContentPart[] = []
    const fileBlocks: ChatCompletionContentPart[] = []
    const textSections: string[] = []

    for (const item of classified) {
      if (item.kind === "image") {
        const base64 = Buffer.from(await item.file.arrayBuffer()).toString("base64")
        imageBlocks.push({
          type: "image_url",
          image_url: { url: `data:${item.file.type || "image/jpeg"};base64,${base64}`, detail: "high" },
        })
      } else if (item.kind === "pdf") {
        const base64 = Buffer.from(await item.file.arrayBuffer()).toString("base64")
        fileBlocks.push({
          type: "file",
          file: { filename: item.file.name, file_data: `data:application/pdf;base64,${base64}` },
        })
      } else if (item.kind === "docx") {
        const buffer = Buffer.from(await item.file.arrayBuffer())
        const { value: text } = await mammoth.extractRawText({ buffer })
        if (!text.trim()) throw new ApiError(422, `Couldn't find any text in "${item.file.name}".`)
        textSections.push(`--- From "${item.file.name}" ---\n${text.trim()}`)
      } else {
        const text = await item.file.text()
        if (!text.trim()) throw new ApiError(422, `"${item.file.name}" is empty.`)
        textSections.push(`--- From "${item.file.name}" ---\n${text.trim()}`)
      }
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const multiSourceNote =
      files.length > 1
        ? ` These ${files.length} files are pages or sections of the same menu (in the order provided) — merge them into ONE unified list of categories. Don't create duplicate categories or items for the same thing shown across two files (e.g. a category heading that continues onto the next page); combine them under a single category instead.`
        : ""
    const textAppendix = textSections.length > 0 ? `\n\nText extracted from uploaded document(s):\n${textSections.join("\n\n")}` : ""

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
              text: `Extract the menu from the provided material as JSON: {"categories":[{"name":string,"items":[{"name":string,"description"?:string,"aliases":string[],"active":true,"prices":{[size:string]:number}}]}]}.
Rules: extract every visible item with exact names; fill prices when visible otherwise 0; for sandwiches/subs use price keys hard_roll_6inch, wrap, 12inch; for everything else use "regular". Return only JSON.${multiSourceNote}${textAppendix}`,
            },
            ...imageBlocks,
            ...fileBlocks,
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
      throw new ApiError(422, "Could not read a menu from what you uploaded. Try a clearer photo or a different file.")
    }
    const menu = menuSchema.safeParse(parsed)
    if (!menu.success) throw new ApiError(422, "The extracted menu was malformed. Try again or enter items manually.")

    return NextResponse.json({ ok: true, ...menu.data })
  } catch (error) {
    return apiError(error)
  }
}
