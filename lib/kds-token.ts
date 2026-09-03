import { createHmac, timingSafeEqual } from "crypto"

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000

function getTokenSecret() {
  return process.env.KDS_TOKEN_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
}

/** Display tokens are bound to a business slug and expire after 30 days. */
export function signDisplayToken(slug: string): string {
  const secret = getTokenSecret()
  if (!secret) throw new Error("KDS token secret is not configured")

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

// ---------------------------------------------------------------------------
// Kitchen PIN hashing. PINs are short so we HMAC them with the server secret
// (keyed hash) and store only the digest in businesses.display_pin_hash.
// ---------------------------------------------------------------------------

export const PIN_RE = /^\d{4,8}$/

export function hashPin(businessId: string, pin: string): string {
  const secret = getTokenSecret()
  if (!secret) throw new Error("KDS token secret is not configured")
  return createHmac("sha256", secret).update(`${businessId}:${pin}`).digest("hex")
}

/**
 * Verify a PIN against either the hashed column (preferred) or the legacy
 * plaintext column (pre-migration databases).
 */
export function verifyPin(
  businessId: string,
  pin: string,
  stored: { display_pin_hash?: string | null; display_pin?: string | null }
): boolean {
  if (stored.display_pin_hash) {
    const expected = Buffer.from(stored.display_pin_hash)
    const actual = Buffer.from(hashPin(businessId, pin))
    return expected.length === actual.length && timingSafeEqual(expected, actual)
  }
  if (stored.display_pin) {
    const expected = Buffer.from(stored.display_pin)
    const actual = Buffer.from(pin)
    return expected.length === actual.length && timingSafeEqual(expected, actual)
  }
  return false
}

export function hasPin(stored: { display_pin_hash?: string | null; display_pin?: string | null }) {
  return Boolean(stored.display_pin_hash || stored.display_pin)
}
