/**
 * Tiny fetch wrapper for calling this app's JSON API routes from the browser.
 * Every route returns `{ ok: true, ...data }` or `{ ok: false, error }`.
 */
export class ApiClientError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function api<T = Record<string, unknown>>(
  path: string,
  init: { method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"; body?: unknown } = {}
): Promise<T & { ok: true }> {
  const res = await fetch(path, {
    method: init.method ?? (init.body ? "POST" : "GET"),
    headers: init.body ? { "Content-Type": "application/json" } : undefined,
    body: init.body ? JSON.stringify(init.body) : undefined,
  })

  const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string } & Record<string, unknown>

  if (!res.ok || json.ok === false) {
    throw new ApiClientError(res.status, json.error ?? `Request failed (${res.status}).`)
  }
  return json as T & { ok: true }
}
