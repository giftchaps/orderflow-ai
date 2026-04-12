import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const image = formData.get("image") as File | null
    if (!image) return NextResponse.json({ error: "No image provided" }, { status: 400 })

    const bytes = await image.arrayBuffer()
    const base64 = Buffer.from(bytes).toString("base64")
    const mimeType = image.type || "image/jpeg"

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Extract the menu from this image and return a JSON object with this exact structure:
{
  "categories": [
    {
      "name": "Category Name",
      "items": [
        {
          "name": "Item Name",
          "description": "optional description",
          "aliases": [],
          "active": true,
          "prices": {
            "hard_roll_6inch": 0,
            "wrap": 0,
            "12inch": 0
          }
        }
      ]
    }
  ]
}

Rules:
- Extract every item you can see
- Use the exact item names from the menu
- Fill in prices if visible, otherwise leave as 0
- For sandwiches/subs, use the price keys: hard_roll_6inch, wrap, 12inch
- For other items (drinks, sides, etc.) use a "regular" price key
- Return ONLY the JSON, no markdown, no explanation`,
            },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64}`, detail: "high" },
            },
          ],
        },
      ],
      max_tokens: 4096,
    })

    const raw = response.choices[0]?.message?.content ?? ""
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()

    let parsed: any
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: "Failed to parse menu from image" }, { status: 422 })
    }

    return NextResponse.json(parsed)
  } catch (err: any) {
    console.error("[menu/extract]", err)
    return NextResponse.json({ error: err.message ?? "Internal error" }, { status: 500 })
  }
}
