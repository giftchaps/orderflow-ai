import "server-only"

import { getServerEnv } from "@/lib/env"
import { ApiError } from "@/lib/auth/guards"

/**
 * Guards the legacy, single-tenant order-ingest endpoints (`/api/orders`
 * without a `slug`). These predate the multi-tenant session model and are
 * unauthenticated by nature — no staff session or KDS token is involved —
 * so the only thing standing between them and the public internet is
 * ORDERFLOW_INGEST_SECRET.
 *
 * The secret must be configured for these endpoints to work at all: an
 * optional-but-unset secret would mean "open to anyone", which defeats the
 * point of hardening them. Callers pass it as `x-ingest-secret`.
 */
export function requireIngestSecret(req: Request) {
  const { ORDERFLOW_INGEST_SECRET } = getServerEnv()
  if (!ORDERFLOW_INGEST_SECRET) {
    throw new ApiError(
      503,
      "Legacy order ingestion is disabled: set ORDERFLOW_INGEST_SECRET to enable it, or pass ?slug=<business-slug> with a staff session or KDS token instead."
    )
  }
  const provided = req.headers.get("x-ingest-secret")
  if (!provided || provided !== ORDERFLOW_INGEST_SECRET) {
    throw new ApiError(401, "Missing or invalid x-ingest-secret.")
  }
}
