import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { normalizeEmail } from "@/lib/auth/normalize-email"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

const bodySchema = z.object({
  owner_email: z.string().email().nullable().optional(),
  plan: z.enum(["starter", "growth", "pro"]).optional(),
  is_active: z.boolean().optional(),
  display_pin: z
    .string()
    .regex(/^\d{4,8}$/, "PIN must be 4-8 digits.")
    .nullable()
    .optional(),
})

type BusinessUpdates = {
  owner_email?: string | null
  plan?: "starter" | "growth" | "pro"
  is_active?: boolean
  display_pin?: string | null
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const role = await getUserRole()

  if (!role?.is_super_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { businessId } = await params
    const body = bodySchema.parse(await request.json())
    const supabase = createSupabaseServerClient()

    const updates: BusinessUpdates = {}

    if ("owner_email" in body) {
      updates.owner_email = body.owner_email ? normalizeEmail(body.owner_email) : null
    }
    if ("plan" in body) {
      updates.plan = body.plan ?? "starter"
    }
    if ("is_active" in body) {
      updates.is_active = body.is_active ?? true
    }
    if ("display_pin" in body) {
      updates.display_pin = body.display_pin ?? null
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No changes provided." }, { status: 400 })
    }

    const { error: updateError } = await supabase
      .from("businesses")
      .update(updates)
      .eq("id", businessId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    const ownerEmail = typeof updates.owner_email === "string" ? updates.owner_email : null

    if (ownerEmail) {

      const { data: existingOwner } = await supabase
        .from("businesses_staff")
        .select("id, email, user_id")
        .eq("business_id", businessId)
        .eq("role", "owner")
        .is("user_id", null)
        .limit(1)
        .maybeSingle()

      if (existingOwner) {
        const { error: staffUpdateError } = await supabase
          .from("businesses_staff")
          .update({ email: ownerEmail })
          .eq("id", existingOwner.id)

        if (staffUpdateError) {
          return NextResponse.json({ error: staffUpdateError.message }, { status: 500 })
        }
      } else {
        const { data: matchingStaff } = await supabase
          .from("businesses_staff")
          .select("id")
          .eq("business_id", businessId)
          .ilike("email", ownerEmail)
          .maybeSingle()

        if (matchingStaff) {
          const { error: promoteError } = await supabase
            .from("businesses_staff")
            .update({ role: "owner" })
            .eq("id", matchingStaff.id)

          if (promoteError) {
            return NextResponse.json({ error: promoteError.message }, { status: 500 })
          }
        } else {
          const { error: insertError } = await supabase.from("businesses_staff").insert({
            business_id: businessId,
            email: ownerEmail,
            role: "owner",
            is_super_admin: false,
          })

          if (insertError) {
            return NextResponse.json({ error: insertError.message }, { status: 500 })
          }
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body.", issues: error.issues.map((issue) => issue.message) },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update business." },
      { status: 500 }
    )
  }
}
