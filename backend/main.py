import os
import json
import logging
from dotenv import load_dotenv
from fastapi import FastAPI, Request, HTTPException
from openai import OpenAI
from supabase import create_client, Client

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]
# Strip any "ID:" prefix that may be present in the env value
BUSINESS_ID = os.environ["ORDERFLOW_BUSINESS_ID"].removeprefix("ID:")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
openai_client = OpenAI(api_key=OPENAI_API_KEY)

EXTRACTION_PROMPT = """You are an order extraction system for Provenzano's Deli.
Extract the food order from this transcript.
Return ONLY a valid JSON array, no other text.
Format: [{{"name": "item name", "qty": 1, "bread": "Hard Roll",
"mods": [{{"type": "add", "item": "extra cheese"}},
         {{"type": "remove", "item": "cherry peppers"}}]}}]
Transcript: {transcript}"""


def extract_order_items(transcript: str) -> list:
    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": EXTRACTION_PROMPT.format(transcript=transcript),
                }
            ],
            temperature=0,
        )
        raw = response.choices[0].message.content.strip()
        items = json.loads(raw)
        logger.info("Extracted %d order item(s)", len(items))
        return items
    except Exception as e:
        logger.error("Order extraction failed: %s", e)
        return []


@app.post("/webhook/vapi")
async def vapi_webhook(request: Request):
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

    # Extract customer phone — Vapi puts it at message.customer.number OR message.call.customer.number
    customer_phone = (
        message.get("customer", {}).get("number")
        or message.get("call", {}).get("customer", {}).get("number")
        or "unknown"
    )

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

    if not transcript:
        logger.warning("Empty transcript received — skipping order extraction")
        return {"status": "ok"}

    logger.info("Processing end-of-call-report for %s", customer_phone)

    # Extract structured order items via GPT-4o
    items = extract_order_items(transcript)

    # Insert order into Supabase
    order_data = {
        "business_id": BUSINESS_ID,
        "channel": "phone",
        "customer_phone": customer_phone,
        "items": items,
        "raw_transcript": transcript,
        "status": "pending",
    }

    result = supabase.table("orders").insert(order_data).execute()

    if result.data:
        logger.info("Order saved — id: %s", result.data[0].get("id"))
    else:
        logger.error("Supabase insert returned no data: %s", result)

    return {"status": "ok"}


@app.get("/health")
async def health():
    return {"status": "ok"}
