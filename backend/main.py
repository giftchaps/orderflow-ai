import os
import json
import hmac
import hashlib
import logging
import asyncio
from typing import Optional
import requests
from dotenv import load_dotenv
from fastapi import FastAPI, Request, HTTPException
from openai import OpenAI
from supabase import create_client, Client

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

_REQUIRED = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "OPENAI_API_KEY",
    "ORDERFLOW_BUSINESS_ID",
    "TELNYX_API_KEY",
    "TELNYX_FROM_NUMBER",
]
_missing = [k for k in _REQUIRED if not os.environ.get(k)]
if _missing:
    raise RuntimeError(
        f"Missing required environment variables: {', '.join(_missing)}. "
        "Set them in your .env file or deployment environment before starting."
    )

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]
# Strip any "ID:" prefix that may be present in the env value
BUSINESS_ID = os.environ["ORDERFLOW_BUSINESS_ID"].removeprefix("ID:")
TELNYX_API_KEY = os.environ["TELNYX_API_KEY"]
TELNYX_FROM_NUMBER = os.environ["TELNYX_FROM_NUMBER"]
BUSINESS_NAME = os.environ.get("ORDERFLOW_BUSINESS_NAME", "the restaurant")
BUSINESS_PHONE = os.environ.get("ORDERFLOW_BUSINESS_PHONE", "")
VAPI_WEBHOOK_SECRET = os.environ.get("VAPI_WEBHOOK_SECRET", "")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
openai_client = OpenAI(api_key=OPENAI_API_KEY)


def send_sms(to: str, message: str, from_number: Optional[str] = None) -> None:
    """Send an SMS via Telnyx. Silently logs on failure so the webhook always returns 200.

    from_number lets each business send confirmations from its own number
    (businesses.sms_from_number, set in the admin console's Agent tab)
    instead of every business sharing the one platform-wide Telnyx number.
    """
    try:
        response = requests.post(
            "https://api.telnyx.com/v2/messages",
            headers={
                "Authorization": f"Bearer {TELNYX_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "from": from_number or TELNYX_FROM_NUMBER,
                "to": to,
                "text": message,
            },
            timeout=10,
        )
        if response.status_code in (200, 201):
            logger.info("SMS sent to %s", to)
        else:
            logger.error("Telnyx SMS failed: %s %s", response.status_code, response.text)
    except Exception as e:
        logger.error("SMS send error: %s", e)

MISSED_CALL_REASON_HINTS = ("did-not-answer", "voicemail", "busy", "no-answer")


def is_missed_call(ended_reason: Optional[str], transcript: str) -> bool:
    """
    True when Vapi's endedReason indicates the call never actually connected
    to a conversation (voicemail, no answer, busy) AND we have no transcript
    to back up that a real exchange happened anyway. Used to decide whether
    to fire a missed-call recovery text — see docs on the feature roadmap
    feasibility study for why this stays conservative (no SMS for a call
    that was merely short, or that ended for some other reason).
    """
    if transcript or not ended_reason:
        return False
    reason = ended_reason.lower()
    return any(hint in reason for hint in MISSED_CALL_REASON_HINTS)


def extract_recording_url(artifact: dict, message: dict) -> Optional[str]:
    """
    Vapi's recording location has moved around across payload versions and
    plan tiers; try the documented/observed spots rather than assuming one.
    Returns None (never raises) if none match — the call is still logged
    either way, just without a recording link.
    """
    recording = artifact.get("recording") if isinstance(artifact, dict) else None
    candidates = [
        artifact.get("recordingUrl") if isinstance(artifact, dict) else None,
        artifact.get("stereoRecordingUrl") if isinstance(artifact, dict) else None,
        recording.get("stereoUrl") if isinstance(recording, dict) else None,
        recording.get("mono", {}).get("combinedUrl") if isinstance(recording, dict) else None,
        recording.get("videoUrl") if isinstance(recording, dict) else None,
        message.get("recordingUrl"),
        message.get("call", {}).get("recordingUrl"),
    ]
    for c in candidates:
        if isinstance(c, str) and c:
            return c
    return None


def summarize_call(transcript: str, business_name: str) -> Optional[str]:
    """One short sentence for a business owner skimming their call log. Never raises."""
    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{
                "role": "user",
                "content": (
                    f"Summarize this phone call to {business_name} in ONE short sentence for a "
                    "restaurant owner skimming a call log. Say whether an order was placed and "
                    "mention anything notable (a complaint, a question, a wrong number, etc). "
                    f"Transcript:\n{transcript}"
                ),
            }],
            temperature=0.2,
            max_tokens=80,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.error("Call summary failed: %s", e)
        return None


EXTRACTION_PROMPT_BASE = """You are an order extraction system for {business_name}.
Extract the food order from this transcript and return a JSON object.
Return a JSON object with an "items" array.
Format: {{"items": [{{"name": "item name", "qty": 1, "bread": "Hard Roll",
"mods": [{{"type": "add", "item": "extra cheese"}},
         {{"type": "remove", "item": "cherry peppers"}}]}}]}}

{menu_section}

RULES:
- Always use the canonical item name from the menu above, never the customer's phrasing — match it
  against the item's listed aliases (if any) rather than guessing
- qty is the number of that item ordered (default 1)
- Only include "bread" when the menu above shows bread/size options for that item; omit it otherwise
- mods type must be "add" or "remove"
- mods should capture additions, removals, substitutions, and dressing choices
- If an item doesn't match anything on the menu, use the customer's own words for its name rather
  than inventing a menu item
- If no food order was placed, return {{"items": []}}

Transcript: {transcript}"""

NO_MENU_SECTION = (
    "MENU: no menu is on file for this business yet — extract items exactly as the "
    "customer described them, using their own words for each item's name."
)


def render_menu_section(menu: Optional[dict]) -> str:
    """
    Build the MENU section of the extraction prompt from a business's own
    businesses.menu column (the same structured menu it manages from the
    Menu page in the app, and the same data the live Vapi conversation
    prompt is already built from — see app/api/business/menu/route.ts).

    This used to be one hardcoded menu (one deli's actual items, aliases,
    and bread options) baked into the prompt for every business's calls.
    That worked for the one business it was written for and would have
    produced garbage extractions for anyone else.
    """
    categories = (menu or {}).get("categories") or []
    lines = []
    for cat in categories:
        items = [i for i in (cat.get("items") or []) if i.get("active", True) is not False]
        if not items:
            continue
        entries = []
        for item in items:
            name = (item.get("name") or "").strip()
            if not name:
                continue
            aliases = [a.strip() for a in (item.get("aliases") or []) if a and a.strip()]
            entries.append(f"{name} (also called: {', '.join(aliases)})" if aliases else name)
        if entries:
            lines.append(f"{cat.get('name', 'Menu')}: " + ", ".join(entries))

    if not lines:
        return NO_MENU_SECTION
    return "MENU ITEMS — always use the canonical name on the left, never an alias:\n" + "\n".join(lines)


def extract_order_items(transcript: str, business_name: str, menu: Optional[dict]) -> list:
    try:
        prompt = EXTRACTION_PROMPT_BASE.format(
            business_name=business_name,
            menu_section=render_menu_section(menu),
            transcript=transcript,
        )
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            response_format={"type": "json_object"},
        )
        raw = response.choices[0].message.content.strip()
        logger.info("GPT-4o raw response: %s", raw[:300])
        parsed = json.loads(raw)
        # GPT may return {"items": [...]} or just [...]
        if isinstance(parsed, list):
            items = parsed
        else:
            items = parsed.get("items", parsed.get("order", []))
        logger.info("Extracted %d order item(s)", len(items))
        return items
    except Exception as e:
        logger.error("Order extraction failed: %s", e)
        return []


def resolve_business(assistant_id: Optional[str]) -> dict:
    """
    Resolve which business a call belongs to from the Vapi assistant ID that
    handled it. This backend used to stamp every order with one hardcoded
    ORDERFLOW_BUSINESS_ID regardless of which business's phone number was
    actually called — fine for a single tenant, silently wrong the moment a
    second business exists, since their calls would still be filed under the
    first business (or fail to insert if the ID didn't match any row), so
    they'd never show up on that business's own dashboard.

    Looks up businesses.vapi_assistant_id (set per-business in the admin
    console's Agent tab) first. Falls back to the legacy env var so a
    business that hasn't had its assistant wired up yet — or a webhook
    payload that doesn't carry an assistant id — still resolves to *some*
    real business rather than failing the whole call.
    """
    if assistant_id:
        try:
            result = (
                supabase.table("businesses")
                .select("id, name, phone_number, sms_from_number, menu")
                .eq("vapi_assistant_id", assistant_id)
                .limit(1)
                .maybe_single()
                .execute()
            )
            if result and result.data:
                return result.data
        except Exception as e:
            logger.error("Business lookup by assistant_id=%s failed: %s", assistant_id, e)
        logger.warning(
            "No business has vapi_assistant_id=%s — falling back to ORDERFLOW_BUSINESS_ID=%s",
            assistant_id, BUSINESS_ID,
        )
    else:
        logger.warning(
            "Webhook payload had no assistant id — falling back to ORDERFLOW_BUSINESS_ID=%s",
            BUSINESS_ID,
        )

    try:
        result = (
            supabase.table("businesses")
            .select("id, name, phone_number, sms_from_number, menu")
            .eq("id", BUSINESS_ID)
            .limit(1)
            .maybe_single()
            .execute()
        )
        if result and result.data:
            return result.data
    except Exception as e:
        logger.error("Fallback business lookup for id=%s failed: %s", BUSINESS_ID, e)

    # Last resort: env-var values, so the call still gets an order recorded
    # even if BUSINESS_ID doesn't match any row in businesses.
    return {"id": BUSINESS_ID, "name": BUSINESS_NAME, "phone_number": BUSINESS_PHONE, "sms_from_number": None, "menu": None}


@app.post("/webhook/vapi")
async def vapi_webhook(request: Request):
    # Verify Vapi webhook signature if secret is configured
    if VAPI_WEBHOOK_SECRET:
        raw_body = await request.body()
        signature = request.headers.get("x-vapi-secret", "")
        expected = hmac.new(
            VAPI_WEBHOOK_SECRET.encode(),
            raw_body,
            hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(signature, expected):
            logger.warning("Invalid Vapi webhook signature — request rejected")
            raise HTTPException(status_code=401, detail="Invalid signature")
        try:
            body = json.loads(raw_body)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid JSON body")
    else:
        try:
            body = await request.json()
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid JSON body")

    message = body.get("message", {})
    event_type = message.get("type")

    # Log full payload structure for debugging (keys only to avoid noise)
    logger.info("PAYLOAD TOP-LEVEL KEYS: %s", list(body.keys()))
    logger.info("MESSAGE KEYS: %s", list(message.keys()) if isinstance(message, dict) else message)
    logger.info("EVENT TYPE: %s", event_type)

    if event_type != "end-of-call-report":
        logger.info("Ignoring event type: %s", event_type)
        return {"status": "ok"}

    logger.info("Processing call end event — type: end-of-call-report")

    # Extract customer phone — Vapi puts it at message.customer.number OR message.call.customer.number
    customer_phone = (
        message.get("customer", {}).get("number")
        or message.get("call", {}).get("customer", {}).get("number")
        or "unknown"
    )

    # Extract the Vapi assistant ID that handled this call — this is what lets
    # a single deployed backend serve every business instead of just one.
    # Vapi has put this in different spots across payload versions, so check
    # each one we've seen documented/observed.
    assistant_id = (
        message.get("assistant", {}).get("id")
        or message.get("call", {}).get("assistantId")
        or message.get("call", {}).get("assistant", {}).get("id")
        or body.get("assistant", {}).get("id")
        or None
    )
    logger.info("ASSISTANT ID: %s", assistant_id)

    # resolve_business (and everything else below that hits Supabase/OpenAI/Telnyx)
    # is a plain blocking call. Running it directly here would freeze this whole
    # process's event loop until it returns — fine with one call at a time, but
    # with several businesses now sharing this one backend, two calls ending
    # within moments of each other would queue up and process one after another
    # instead of concurrently. asyncio.to_thread hands each blocking call to a
    # worker thread so this request's slow I/O doesn't block anyone else's.
    business = await asyncio.to_thread(resolve_business, assistant_id)
    business_id = business["id"]
    business_name = business.get("name") or BUSINESS_NAME
    business_phone = business.get("phone_number") or BUSINESS_PHONE
    business_sms_from = business.get("sms_from_number")
    business_menu = business.get("menu")
    logger.info("Resolved business: id=%s name=%s", business_id, business_name)

    # Log artifact structure so we can see exactly where the transcript lives
    artifact = message.get("artifact", {})
    logger.info("ARTIFACT KEYS: %s", list(artifact.keys()) if isinstance(artifact, dict) else artifact)
    logger.info("ARTIFACT FULL: %s", str(artifact)[:500])

    # Vapi may send transcript at message.artifact.transcript or message.transcript
    transcript = (
        artifact.get("transcript")
        or message.get("transcript")
        or ""
    )
    logger.info("TRANSCRIPT (first 300 chars): %s", transcript[:300] if transcript else "EMPTY")

    # Extract Vapi call ID for idempotency — present at message.call.id
    vapi_call_id = message.get("call", {}).get("id") or None
    ended_reason = message.get("endedReason") or message.get("call", {}).get("endedReason")
    recording_url = extract_recording_url(artifact, message)
    duration_seconds = message.get("durationSeconds") or message.get("call", {}).get("durationSeconds")

    logger.info(
        "Processing end-of-call-report for %s (call_id=%s, business_id=%s, endedReason=%s)",
        customer_phone, vapi_call_id, business_id, ended_reason,
    )

    # Every call gets logged here — recording, transcript and a short summary
    # — whether or not it becomes an order. Previously a call with no
    # transcript (wrong number, hang-up, voicemail) left no trace anywhere.
    summary = await asyncio.to_thread(summarize_call, transcript, business_name) if transcript else None
    call_log_row = {
        "provider": "vapi",
        "event_type": "end-of-call-report",
        "external_id": vapi_call_id,
        "business_id": business_id,
        "caller_number": customer_phone if customer_phone != "unknown" else None,
        "transcript": transcript or None,
        "recording_url": recording_url,
        "duration_seconds": duration_seconds,
        "ended_reason": ended_reason,
        "summary": summary,
        "payload": body,
        "status": "processed",
    }

    def save_call_log():
        if vapi_call_id:
            return (
                supabase.table("webhook_events")
                .upsert(call_log_row, on_conflict="provider,external_id")
                .execute()
            )
        return supabase.table("webhook_events").insert(call_log_row).execute()

    call_log_id = None
    try:
        call_log_result = await asyncio.to_thread(save_call_log)
        if call_log_result.data:
            call_log_id = call_log_result.data[0].get("id")
    except Exception as e:
        # A logging failure should never block order-taking — log it and move on.
        logger.error("Failed to write call log for call_id=%s: %s", vapi_call_id, e)

    if not transcript:
        logger.warning("Empty transcript received — skipping order extraction")
        # Missed-call recovery: the call never connected to a conversation
        # (voicemail/no-answer/busy) — text the caller so the business
        # doesn't just lose the order. Never fires when a transcript exists,
        # so this can't double up with the order-confirmation text below.
        if is_missed_call(ended_reason, transcript) and customer_phone and customer_phone != "unknown":
            callback = f"Call us back at {business_phone}" if business_phone else "Give us a call back"
            await asyncio.to_thread(
                send_sms,
                customer_phone,
                f"Sorry we missed your call at {business_name}! {callback} to place your order.",
                business_sms_from,
            )
        return {"status": "ok"}

    # Extract structured order items via GPT-4o, using this business's own menu
    items = await asyncio.to_thread(extract_order_items, transcript, business_name, business_menu)

    if not items:
        # A transcript exists (this isn't the missed-call case above) but no
        # extractable order came out of it — background noise, a wrong
        # number, a caller who just asked a question, or (for a multilingual
        # business) the transcriber not actually understanding what was
        # said. Previously this still inserted a blank order, which just
        # left an empty ticket sitting in the kitchen queue for staff to
        # notice and cancel by hand. The full transcript is already saved to
        # webhook_events above (visible on the business's Calls page), so
        # log a warning for debugging and skip creating the order.
        logger.warning(
            "No order items extracted for call_id=%s business_id=%s — not creating a blank order. "
            "Transcript: %s",
            vapi_call_id, business_id, transcript[:500],
        )
        if customer_phone and customer_phone != "unknown":
            callback = f" at {business_phone}" if business_phone else ""
            await asyncio.to_thread(
                send_sms,
                customer_phone,
                f"Thanks for calling {business_name}! We didn't catch an order from that call — give us a call back{callback} if you'd like to place one.",
                business_sms_from,
            )
        return {"status": "ok", "detail": "no items extracted"}

    # Insert order — ON CONFLICT on (business_id, vapi_call_id) means retried
    # webhooks for the same call are silently ignored rather than creating duplicates.
    order_data = {
        "business_id": business_id,
        "channel": "phone",
        "customer_phone": customer_phone,
        "items": items,
        "raw_transcript": transcript,
        "status": "pending",
        **({"vapi_call_id": vapi_call_id} if vapi_call_id else {}),
    }

    def save_order():
        if vapi_call_id:
            return (
                supabase.table("orders")
                .upsert(order_data, on_conflict="business_id,vapi_call_id", ignore_duplicates=True)
                .execute()
            )
        return supabase.table("orders").insert(order_data).execute()

    try:
        result = await asyncio.to_thread(save_order)
    except Exception as e:
        # This used to be an unhandled exception that crashed the whole webhook with a
        # raw 500 — one broken upsert (e.g. the ON CONFLICT target not matching a real
        # unique index) took down every business's order logging, not just this call.
        # Fall back to a plain insert so the order isn't lost outright, then give up
        # loudly (but gracefully) if even that fails.
        logger.error(
            "Order upsert failed for call_id=%s business_id=%s: %s. Falling back to a plain "
            "insert so this order isn't lost — if this keeps happening, check that `orders` has "
            "a real (non-partial) unique index on (business_id, vapi_call_id).",
            vapi_call_id, business_id, e,
        )
        try:
            result = await asyncio.to_thread(lambda: supabase.table("orders").insert(order_data).execute())
        except Exception as e2:
            logger.error(
                "Fallback insert also failed for call_id=%s business_id=%s: %s — order was NOT "
                "saved. The transcript and extracted items are in the log above for manual recovery.",
                vapi_call_id, business_id, e2,
            )
            return {"status": "error", "detail": "Could not save order"}

    if result.data:
        order = result.data[0]
        logger.info("Order saved — id: %s", order.get("id"))

        # Link the call log row (if we managed to write one above) to this order, so the
        # Calls page can show "Order placed" instead of "No order". Best-effort — a failure
        # here must never affect the order that was already successfully saved.
        if call_log_id:
            try:
                await asyncio.to_thread(
                    lambda: supabase.table("webhook_events")
                    .update({"order_id": order.get("id")})
                    .eq("id", call_log_id)
                    .execute()
                )
            except Exception as e:
                logger.error("Failed to link call log %s to order %s: %s", call_log_id, order.get("id"), e)

        # Send SMS confirmation to customer, from this business's own number when it has one
        if customer_phone and customer_phone != "unknown":
            order_number = order.get("order_number", "")
            item_count = len(items)
            item_summary = f"{item_count} item{'s' if item_count != 1 else ''}"
            contact = f" Questions? Call {business_phone}." if business_phone else ""
            await asyncio.to_thread(
                send_sms,
                customer_phone,
                (
                    f"Hi! Your order #{order_number} has been received at {business_name} "
                    f"({item_summary}). We'll text you when it's ready.{contact}"
                ),
                business_sms_from,
            )
    else:
        logger.error("Supabase insert returned no data: %s", result)

    return {"status": "ok"}


@app.get("/health")
async def health():
    return {"status": "ok"}
