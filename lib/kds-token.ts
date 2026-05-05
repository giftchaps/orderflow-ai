import { createHmac, timingSafeEqual } from "crypto"

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000

function getTokenSecret() {
  return process.env.KDS_TOKEN_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
}

export function signDisplayToken(slug: string): string {
  const secret = getTokenSecret()
  if (!secret) {
    throw new Error("KDS token secret is not configured")
  }

  const exp = Date.now() + TOKEN_TTL_MS
  const payload = `${slug}:${exp}`
  const sig = createHmac("sha256", secret).update(payload).digest("hex")

  return Buffer.from(`${payload}:${sig}`).toString("base64url")
}

export function verifyDisplayToken(slug: string, token: string): boolean {
  try {
    const secret = getTokenSecret()
    if (!secret) return false

    const decoded = Buffer.from(token, "base64url").toString("utf8")
    const parts = decoded.split(":")
    if (parts.length !== 3) return false

    const [tokenSlug, expStr, sig] = parts
    if (tokenSlug !== slug) return false

    const exp = Number(expStr)
    if (!Number.isFinite(exp) || Date.now() > exp) return false

    const expected = createHmac("sha256", secret).update(`${tokenSlug}:${expStr}`).digest("hex")
    const actualBuffer = Buffer.from(sig)
    const expectedBuffer = Buffer.from(expected)

    return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
  } catch {
    return false
  }
}
