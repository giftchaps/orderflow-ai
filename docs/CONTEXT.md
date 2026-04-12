# OrderFlow AI — Master Project Context
## Single Source of Truth for All Development

**Built by:** ResurgeX Technologies  
**Pilot Customer:** Provenzano's Deli, 153 Saw Mill Road, West Haven, CT  
**Date:** April 2026  

---

## 1. What This Project Is

OrderFlow AI is a voice-first, multi-channel AI order intake platform for small food businesses. The core problem it solves: small delis and food shops lose orders and staff time answering phones every day. OrderFlow AI replaces the human who answers the phone.

A customer calls a phone number. An AI voice agent answers, greets them by the business name, takes their full order including all customizations, confirms it, and ends the call. The order instantly appears on a kitchen display screen. The customer gets an SMS confirmation. When the order is ready, staff tap Done and the customer gets another SMS.

The system is multi-tenant — one platform serving many businesses. Each business gets its own phone number, menu, kitchen display URL, and analytics.

---

## 2. Current Architecture

```
Customer calls
      ↓
Vapi.ai Voice Agent (+1 216 777 6065)
  - Answers as Provenzano's Deli
  - Takes order conversationally
  - Handles all customizations
  - Confirms order and ends call
      ↓
Vapi fires webhook (end-of-call-report)
      ↓
FastAPI Backend (to be deployed on Railway)
  - Receives webhook
  - Extracts order items via GPT-4o
  - Saves to Supabase
      ↓
Supabase (PostgreSQL + Realtime)
  - Stores order with all fields
  - Fires realtime event to display
      ↓
Kitchen Display (Vercel)
  - Shows live order card
  - Staff taps Accept → Making → Done
  - Done triggers customer SMS
```

---

## 3. What Is DONE and WORKING

### Vapi Voice Agent ✅
- Assistant name: **Provenzanos Order Agent**
- Assistant ID: `9ffca22f-e465-4ffc-a7f6-95ba796ac7f8`
- Phone number: **+1 (216) 777 6065** (Vapi free number)
- Voice: 11labs, Aryannah
- Model: GPT-4o
- First message: "Thank you for calling Provenzano's Deli, what can I get for you today?"
- Full Provenzano's menu is loaded in the system prompt including all items, prices, modifications, and aliases
- Agent answers calls, takes orders, handles customizations, confirms orders
- Agent fires webhook to server URL on call end

### Supabase Database ✅
- Project URL: `https://mvrjmpituoybwxpjnb.supabase.co`
- Tables created: `businesses`, `orders`
- Realtime enabled on orders table
- Provenzano's Deli seeded as first business in businesses table
- Auto-incrementing order_number trigger working per business

### Kitchen Display ✅
- Deployed at: `https://v0-orderflow-ai.vercel.app`
- Also at: `https://v0-orderflow-ai-git-main-chapfuradombogift-gmailcoms-projects.vercel.app`
- GitHub repo: `https://github.com/giftchaps/orderflow-ai`
- Shows live order cards in three columns: New, Making, Ready
- Order cards show: order number, channel badge, timer, customer phone, items, modifications
- Accept and Done buttons working
- Connected to Supabase

### Accounts Set Up ✅
- GitHub: github.com/giftchaps/orderflow-ai
- Supabase: project orderflow-ai
- Twilio: account active, number (855) 964-4312 (trial — not used for calls yet)
- Vapi: account active, free number assigned
- n8n Cloud: resurgextech.app.n8n.cloud (being replaced)
- Vercel: kitchen display deployed

---

## 4. What Is NOT Working / Still To Build

### IMMEDIATE PRIORITY — FastAPI Backend
n8n is being replaced entirely with a Python FastAPI server. This is the next thing to build.

The n8n approach failed because:
- business_id was not being passed correctly to Supabase
- OpenAI node had wrong operation type causing errors
- Too fragile for production use

### After FastAPI — In Order:
1. SMS confirmation to customer when order is received
2. SMS notification to customer when order is ready
3. Fix kitchen display real-time updates (currently needs manual refresh)
4. End call automatically after order confirmed in Vapi
5. Admin portal for menu management
6. Multi-tenant onboarding flow

---

## 5. The FastAPI Backend — Exact Specification

### File: `backend/main.py`

```python
# What this file must do:
# 1. Accept POST /webhook/vapi
# 2. Only process events where message.type == "end-of-call-report"
# 3. Extract customer_phone from message.call.customer.number
# 4. Extract transcript from message.artifact.transcript
# 5. Call GPT-4o to extract structured order items from transcript
# 6. Save order to Supabase orders table
# 7. Return {"status": "ok"} with 200

# GPT-4o prompt for order extraction:
# "You are an order extraction system for Provenzano's Deli.
#  Extract the food order from this transcript.
#  Return ONLY a valid JSON array, no other text.
#  Format: [{"name": "item name", "qty": 1, "bread": "Hard Roll",
#  "mods": [{"type": "add", "item": "extra cheese"},
#           {"type": "remove", "item": "cherry peppers"}]}]
#  Transcript: {transcript}"
```

### File: `backend/requirements.txt`
```
fastapi
uvicorn
supabase
openai
python-dotenv
```

### File: `backend/.env` (never commit this)
```
SUPABASE_URL=https://mvrjmpituoybwxpjnb.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_key
BUSINESS_ID=uuid_from_businesses_table
PORT=8000
```

### Deployment: Railway.app
- Connect GitHub repo
- Set environment variables in Railway dashboard
- Railway gives a public URL like `https://orderflow-ai.up.railway.app`
- Update Vapi Organization Settings → Server URL to that Railway URL

---

## 6. Database Schema

### businesses table
```sql
id                uuid PRIMARY KEY
name              text NOT NULL
slug              text UNIQUE NOT NULL
phone_number      text UNIQUE
whatsapp_number   text
ai_system_prompt  text
menu              jsonb
prep_time_minutes integer DEFAULT 15
business_hours    jsonb
timezone          text DEFAULT 'America/New_York'
address           text
is_active         boolean DEFAULT true
created_at        timestamptz
```

### orders table
```sql
id                   uuid PRIMARY KEY
business_id          uuid REFERENCES businesses(id)
order_number         integer (auto-set by trigger per business)
channel              text  -- 'phone' | 'whatsapp_text' | 'whatsapp_voice' | 'sms'
customer_phone       text
items                jsonb DEFAULT '[]'
special_instructions text
raw_transcript       text
status               text DEFAULT 'pending'
                     -- 'pending' | 'accepted' | 'making' | 'ready' | 'done' | 'cancelled'
notified_received    boolean DEFAULT false
notified_ready       boolean DEFAULT false
placed_at            timestamptz
accepted_at          timestamptz
ready_at             timestamptz
completed_at         timestamptz
```

---

## 7. Provenzano's Menu (Summary)

Full menu JSON is in `docs/provenzanos_menu.json`

**Categories:**
- Cold Deli Sandwiches (Hard Roll/6" $10, Wrap $11, 12" $13.25)
- Hot Deli Sandwiches (same pricing)
- Combos (Hard Roll/6" $12.50, Wrap $13.50, 12" $15.50)
- Premium Sandwiches (Hard Roll/6" $11, Wrap $12, 12" $15.25)
- Signature Sandwiches (Hard Roll/6" $10, Wrap $11, 12" $13.25)
- Salads (all $12)
- Breakfast (served until 3PM)
- Catering Trays
- Party Subs

**Key items and aliases:**
- Michelangelo (mike, mikey) — buffalo chicken cutlet, steak, american cheese
- Provy — chicken cutlet, bacon, american cheese, spicy mayo
- Murph Man — chicken cutlet, meatball, sharp provolone
- Rabe Thompson — chicken cutlet, broccoli rabe, honey mustard, roasted red peppers, provolone
- Sinatra — prosciutto, broccoli rabe, roasted red peppers, fresh mozzarella
- Chicken Parm / Eggplant Parm / Meatball Parm (combos)

**Bread options:** Hard Roll (default), 6" Sub, 12" Sub, Wrap (White/Wheat/Spinach)

---

## 8. File Structure

```
orderflow-ai/
  backend/
    main.py          ← TO BE BUILT (FastAPI webhook server)
    requirements.txt ← TO BE BUILT
    .env             ← TO BE CREATED (never commit)
  docs/
    OrderFlow_AI_Blueprint_v2.docx
    provenzanos_menu.json
    vapi_system_prompt.txt
    schema.sql
    CONTEXT.md       ← THIS FILE
  kitchen_display/   ← Next.js app (already working on Vercel)
  README.md
```

---

## 9. Key Credentials and IDs

| Item | Value |
|------|-------|
| Vapi Assistant ID | 9ffca22f-e465-4ffc-a7f6-95ba796ac7f8 |
| Vapi Phone Number | +1 (216) 777 6065 |
| Supabase URL | https://mvrjmpituoybwxpjnb.supabase.co |
| Kitchen Display | https://v0-orderflow-ai.vercel.app |
| GitHub Repo | https://github.com/giftchaps/orderflow-ai |
| n8n (being replaced) | resurgextech.app.n8n.cloud |

**Note:** All secret keys (Supabase service key, OpenAI API key) are stored only in .env files and Railway environment variables. Never committed to GitHub.

---

## 10. Agreed Architecture Decisions (DO NOT CHANGE)

These decisions were made after comparing recommendations from multiple AI systems and must not be deviated from:

1. **Voice agent = Vapi.ai** — handles phone calls, not Twilio Voice
2. **Phone number = Vapi free number** — not Twilio (Twilio trial restrictions)
3. **Backend = Python FastAPI** — not n8n (too fragile for production)
4. **Database = Supabase PostgreSQL** — with Realtime for kitchen display
5. **Kitchen display = React/Next.js on Vercel** — already built and working
6. **Order extraction = GPT-4o** — called from FastAPI backend
7. **Deployment = Railway.app** — for FastAPI backend
8. **Architecture rule = one pipeline, one schema, one dashboard** — no separate systems per channel
9. **Build order = phone first** — calls are 80% of volume at a deli
10. **Multi-tenant from day one** — every table has business_id

---

## 11. What To Build Right Now

**Step 1:** Build `backend/main.py` — FastAPI webhook server (spec in Section 5)  
**Step 2:** Build `backend/requirements.txt`  
**Step 3:** Test locally with `uvicorn main:app --reload`  
**Step 4:** Deploy to Railway.app  
**Step 5:** Update Vapi Organization Settings → Server URL to Railway URL  
**Step 6:** Delete n8n workflow (no longer needed)  
**Step 7:** Test full end-to-end: call → AI takes order → order on kitchen display  
**Step 8:** Add Twilio SMS confirmation  
**Step 9:** Fix kitchen display real-time (Supabase Realtime subscription)  
**Step 10:** Record demo video for Provenzano's pitch  

---

## 12. Definition of Done (Phase 1)

Phase 1 is complete when:
- [ ] A phone call to +1 (216) 777 6065 is answered by the AI
- [ ] AI correctly takes an order with customizations
- [ ] Order appears on kitchen display within 10 seconds of call ending
- [ ] Order shows correct item name, bread, and all modifications
- [ ] Staff can tap Accept, Making, Done on the display
- [ ] Customer receives SMS confirmation after order is received
- [ ] Customer receives SMS when order is marked Done
- [ ] System has been tested with at least 10 real calls
- [ ] Demo video recorded showing full flow

---

*This document is the single source of truth. All development follows this spec. Do not deviate.*
