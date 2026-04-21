import os
import json
import hmac
import hashlib
import logging
import requests
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
TELNYX_API_KEY = os.environ["TELNYX_API_KEY"]
TELNYX_FROM_NUMBER = os.environ["TELNYX_FROM_NUMBER"]
BUSINESS_NAME = os.environ.get("ORDERFLOW_BUSINESS_NAME", "the restaurant")
BUSINESS_PHONE = os.environ.get("ORDERFLOW_BUSINESS_PHONE", "")
VAPI_WEBHOOK_SECRET = os.environ.get("VAPI_WEBHOOK_SECRET", "")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
openai_client = OpenAI(api_key=OPENAI_API_KEY)


def send_sms(to: str, message: str) -> None:
    """Send an SMS via Telnyx. Silently logs on failure so the webhook always returns 200."""
    try:
        response = requests.post(
            "https://api.telnyx.com/v2/messages",
            headers={
                "Authorization": f"Bearer {TELNYX_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "from": TELNYX_FROM_NUMBER,
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

EXTRACTION_PROMPT = """You are an order extraction system for {business_name}.
Extract the food order from this transcript and return a JSON object.
Return a JSON object with an "items" array.
Format: {{"items": [{{"name": "item name", "qty": 1, "bread": "Hard Roll",
"mods": [{{"type": "add", "item": "extra cheese"}},
         {{"type": "remove", "item": "cherry peppers"}}]}}]}}

BREAD OPTIONS (use exactly these values):
- "Hard Roll"
- "6-inch Sub"
- "12-inch Sub"
- "Plain Wrap" (use for: plain wrap, regular wrap, white wrap, or just "wrap" with no type specified)
- "Spinach Wrap"
- "Whole Wheat Wrap" (use for: wheat wrap, whole wheat, whole wheat wrap)
- Normalize spoken sizes: "six inch" -> "6-inch Sub", "twelve inch" -> "12-inch Sub"

MENU ITEMS — always use the canonical name on the left, never the alias:
Cold Deli: Buffalo Chicken Salad, Capicola Chicken Salad, Chicken Salad, Corned Beef, Ham, DiLussi Salami, Turkey, Pepperoni, Sopressata Hot, Sopressata Sweet, Tuna Salad
Hot Deli: Chicken Cutlet, Buffalo Chicken Cutlet, Grilled Chicken, Grilled Buffalo Chicken, Grilled Cheese, BLT
Combos: Chicken Parmesan, Eggplant Parmesan, Meatball Parmesan, Home-Cooked Roast Beef, Pastrami, Prosciutto, Steak, Sweet Italian Combo, Hot Italian Combo, The Deluxe
Premium: Alaina Marie, Cousin Vinny, Kerbear, Murph Man, The Parm, Provy, Rudenzano, Michelangelo, Rabe Thompson, Sinatra, Sausage and Peppers, Wes
Signature: Ainsley Joyce, De Niro, Donatello, Galileo, Leonardo, Inferno, Nana, The Pop, Raphael, Tuna Bomb
Salads (no bread): Balsamic Salad, Caesar Salad, Nana Salad, Greek Salad, Mixed Greens and Tuna Salad, De Niro Salad
Breakfast: Breakfast on a Roll, Double Breakfast on a Roll, Italian Bomber, Breakfast Provy, Double Egg Sandwich, 4 Eggs on a Sub, Assorted Muffins, Buttered Roll, Bagel, Bagel with Cream Cheese, Side Homefries (Small), Side Homefries (Large)

ALIAS EXAMPLES:
- "chicken parm" -> "Chicken Parmesan"
- "meatball parm" or "meatball sub" -> "Meatball Parmesan"
- "eggplant parm" -> "Eggplant Parmesan"
- "provy" or "provi" -> "Provy"
- "tuna bomb" or "tunabomb" -> "Tuna Bomb"
- "michelangelo" or "mike" or "mikey" -> "Michelangelo"
- "roast beef" -> "Home-Cooked Roast Beef"
- "hot italian" -> "Hot Italian Combo"
- "sweet italian" -> "Sweet Italian Combo"
- "buff chicken cutlet" or "buffalo cutlet" -> "Buffalo Chicken Cutlet"
- "greek salad" or "greek" -> "Greek Salad"
- "caesar" -> "Caesar Salad"
- "bomber" -> "Italian Bomber"
- "breakfast provy" -> "Breakfast Provy"

RULES:
- qty is the number of that item ordered (default 1)
- Salads do not have a bread field — omit it or set to null
- mods type must be "add" or "remove"
- mods should capture additions, removals, substitutions, and dressing choices
- If no food order was placed, return {{"items": []}}

Transcript: {transcript}"""


def extract_order_items(transcript: str) -> list:
    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": EXTRACTION_PROMPT.format(
                        business_name=BUSINESS_NAME,
                        transcript=transcript,
                    ),
                }
            ],
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
        order = result.data[0]
        logger.info("Order saved — id: %s", order.get("id"))

        # Send SMS confirmation to customer
        if customer_phone and customer_phone != "unknown":
            order_number = order.get("order_number", "")
            item_count = len(items)
            item_summary = f"{item_count} item{'s' if item_count != 1 else ''}"
            contact = f" Questions? Call {BUSINESS_PHONE}." if BUSINESS_PHONE else ""
            send_sms(
                to=customer_phone,
                message=(
                    f"Hi! Your order #{order_number} has been received at {BUSINESS_NAME} "
                    f"({item_summary}). We'll text you when it's ready.{contact}"
                ),
            )
    else:
        logger.error("Supabase insert returned no data: %s", result)

    return {"status": "ok"}


@app.get("/health")
async def health():
    return {"status": "ok"}
