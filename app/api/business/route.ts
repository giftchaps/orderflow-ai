import { NextResponse } from "next/server"
import { getServerEnv } from "@/lib/env"

export const dynamic = "force-dynamic"

export async function GET() {
  const { ORDERFLOW_BUSINESS_NAME, ORDERFLOW_BUSINESS_PHONE } = getServerEnv()

  return NextResponse.json({
    name: ORDERFLOW_BUSINESS_NAME,
    phone: ORDERFLOW_BUSINESS_PHONE ?? null,
  })
}
