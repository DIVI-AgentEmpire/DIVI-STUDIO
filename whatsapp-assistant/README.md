# Hasiru Basket: WhatsApp AI assistant (demo)

A demo WhatsApp assistant for **Hasiru Basket**, a *fictional* grocery and daily-milk
subscription store in Bengaluru. You can show it to small online businesses as a sample of
your AI automation service.

**It costs ₹0 to run.** It uses the free WhatsApp Cloud API test number, Groq's free AI
plan, and Vercel's free hosting. You don't need a credit card for any of them.

## What it does

| Customer says… | Assistant does |
|---|---|
| "milk price?", "ಹಾಲು ಬೆಲೆ ಎಷ್ಟು?", "akki ide?" | Looks up products, prices and stock (English, Kannada and romanised Kannada names) |
| "Where is my order?", "HB-1046 status" | Shows order status, items, total, delivery slot and rider |
| "Deliver HB-1046 tomorrow morning" | Lists free delivery slots and books one (full or past slots are refused) |
| "ನಾಳೆ ಹಾಲು ಬೇಡ", "skip milk on Friday" | Skips one day of the milk subscription |
| "Going to Mysuru 10th to 15th, pause milk" | Pauses the subscription for a date range (max 30 days) |
| "Resume my milk" | Removes upcoming pauses and skips |
| "My eggs came broken", "talk to a person" | **Hands over to a human.** You get a WhatsApp alert, the bot goes quiet, and you reply from your own phone |

- **Language:** it replies in the customer's style. Kannada script gets Kannada script, Kannada typed in English letters ("naale haalu beda") gets the same back, and English gets English.
- **Business rules are enforced in code, not left to the AI:**
  - Milk changes for a day must be made before 10 PM the night before.
  - A delivery slot must start at least 2 hours from now.
  - Orders that are delivered or out for delivery can't be changed.
- **Each customer sees only their own data.** Anyone who messages gets their own copy of the sample data: 3 orders and a milk subscription. Type `reset demo` to start fresh.
- **It never makes things up.** Prices, orders and slots come only from the sample data in `lib/data.js`.

## How it works

```
Customer's WhatsApp ──► Meta WhatsApp Cloud API ──► Vercel: /api/webhook
                                                        │
                                   Groq AI (gpt-oss-120b) decides which tool to call:
                                   search_products · get_order_status · list/book slots ·
                                   get/skip/pause/resume subscription · handover_to_human
                                                        │
Customer's WhatsApp ◄── Meta WhatsApp Cloud API ◄───────┘ reply
```

| File | Purpose |
|---|---|
| `api/webhook.js` | Vercel function. Handles Meta's verification (GET), checks message signatures and receives messages (POST) |
| `api/health.js` | `/api/health`: shows which settings are present (never their values) |
| `lib/handler.js` | Ignores duplicate messages, runs handover mode, owner commands and `reset demo` |
| `lib/agent.js` | Groq tool-calling loop and the system prompt |
| `lib/tools.js` | The 10 tools and their business rules |
| `lib/data.js` | **Fake** store, catalogue, orders and subscription. Edit this to tailor a demo for a client |
| `lib/language.js` | Kannada / Kanglish / English detection and fixed messages |
| `lib/store.js` | Storage: in memory, or Upstash Redis if configured |
| `scripts/chat.js` | Chat with the bot in your terminal, with no WhatsApp setup needed |

---

## Step-by-step setup

Total time is about 45 minutes. Do the steps in order. Meta sometimes renames buttons, so if a
label looks slightly different, look for the closest match.

You'll collect these values along the way. Keep them in a private note, **never** in GitHub:

| Name | Where it comes from |
|---|---|
| `GROQ_API_KEY` | Step 1 |
| `WHATSAPP_TOKEN` | Step 2.4 (temporary) or Step 6 (permanent) |
| `WHATSAPP_PHONE_NUMBER_ID` | Step 2.4 |
| `WHATSAPP_APP_SECRET` | Step 2.6 |
| `WHATSAPP_VERIFY_TOKEN` | **You invent it** (Step 2.7) |
| `OWNER_WHATSAPP_NUMBER` | Your own WhatsApp number, e.g. `919876543210` |

### Step 1: Get a free Groq API key (2 min)

1. Go to <https://console.groq.com> and sign in with Google or email.
2. Open **API Keys** → **Create API Key** → name it `hasiru-demo` → **Submit**.
3. Copy the key (it starts with `gsk_`). This is your `GROQ_API_KEY`. It's shown only once.

**Optional: try the bot in your terminal before setting up Meta.** You need Node.js 20 or
newer from <https://nodejs.org>.

```bash
cd whatsapp-assistant
cp .env.example .env        # then open .env and paste GROQ_API_KEY=gsk_...
npm run chat
```

Type `milk price`, `where is my order`, `ನಾಳೆ ಹಾಲು ಬೇಡ`, or `I want to talk to a person`.
Lines starting with `/owner` act as the shop owner, for example
`/owner /reply 919900000001 Sorry, sending a replacement`.

### Step 2: Meta setup (20–30 min)

#### 2.1 Create a Meta developer account
1. Go to <https://developers.facebook.com> and click **Log in**. Use your Facebook account, or create one.
2. Click **Get Started** (or **Register**). Accept the terms, then verify your phone number and email when asked.

#### 2.2 Create the app
1. Click **My Apps** → **Create App**.
2. **App name:** `Hasiru Demo` (any name works). **App contact email:** your email. Click **Next**.
3. **Use case:** choose **Connect with customers through WhatsApp**. Click **Next**.
4. **Business portfolio:** pick an existing one, or **create a new business portfolio**. It's free; use your name or your agency's name. Click **Next** → **Create app**. Re-enter your Facebook password if asked.

#### 2.3 Open the WhatsApp API Setup page
1. In the app dashboard, open the WhatsApp use case and click **Start using the API**. You can also go to the left menu: **WhatsApp** → **API Setup**.
2. Meta automatically creates a **test WhatsApp Business account** and a **test phone number** for you. If asked to connect or create a WhatsApp/Messaging account, accept the defaults.

#### 2.4 Copy the token and Phone number ID
On the **API Setup** page:
1. Click **Generate access token** and approve the prompts. Copy the long token. This is your `WHATSAPP_TOKEN`.
   > ⚠️ This token **expires in about 24 hours**. That's fine for today; Step 6 gets you a permanent one.
2. Under **Send and receive messages**, the **From** field shows the test number. Below it is the **Phone number ID**, which is a long number (*not* the phone number itself). Copy it. This is your `WHATSAPP_PHONE_NUMBER_ID`.

#### 2.5 Add the phones allowed to chat with the test number
The free test number only talks to **up to 5 phone numbers that you verify**.
1. On the same page, click the **To** field → **Manage phone number list** → **Add phone number**.
2. Enter **your own** WhatsApp number with country code (+91…). WhatsApp sends you a code; enter it.
3. Repeat for each phone you'll demo on, such as a second phone or a client's phone during a meeting. You can remove and add numbers later.
4. Optional: select your number in **To** and click **Send message**. If you receive a "Hello World" message, the WhatsApp side works.
5. Save the **test number** (shown in **From**) as a contact on your phone, e.g. "Hasiru Basket Demo".

#### 2.6 Copy the App Secret
1. Left menu: **App settings** → **Basic**.
2. Next to **App secret**, click **Show**, enter your password, and copy it. This is your `WHATSAPP_APP_SECRET`. The bot uses it to reject fake messages that don't come from Meta.

#### 2.7 Invent your verify token
Make up a random string, e.g. `hasiru-7f3k9q-demo`. This is your `WHATSAPP_VERIFY_TOKEN`.
You'll paste the same value into Vercel (Step 3) and Meta (Step 4).

### Step 3: Deploy to Vercel (10 min)

1. **Get the code onto your main branch.** Vercel deploys your GitHub repo's default branch, so merge this branch into `main` first. You can open a pull request on GitHub and merge it.
2. Go to <https://vercel.com/signup> → **Continue with GitHub** → choose the free **Hobby** plan.
3. Click **Add New…** → **Project**, then **Import** your `divi-studio` repository. Allow Vercel access to it if asked.
4. On the configure screen:
   - **Root Directory:** click **Edit** → choose `whatsapp-assistant`.
   - **Framework Preset:** `Other`. Leave the build settings empty.
   - Open **Environment Variables** and add each of these, one per row:

     | Name | Value |
     |---|---|
     | `GROQ_API_KEY` | from Step 1 |
     | `WHATSAPP_TOKEN` | from Step 2.4 |
     | `WHATSAPP_PHONE_NUMBER_ID` | from Step 2.4 |
     | `WHATSAPP_APP_SECRET` | from Step 2.6 |
     | `WHATSAPP_VERIFY_TOKEN` | your invented string |
     | `OWNER_WHATSAPP_NUMBER` | your number, digits only, e.g. `919876543210` |
5. Click **Deploy** and wait about a minute.
6. Open your production address, e.g. `https://hasiru-demo.vercel.app`. It should say **Ready ✅**. If it lists missing settings, add them under **Settings → Environment Variables**, then go to **Deployments** → **⋯** → **Redeploy**. Settings only apply to new deployments.

> Use the **production** address (`<project>.vercel.app`). The long *preview* addresses are protected by a Vercel login, so Meta can't reach them.

### Step 4: Connect Meta to your Vercel webhook (3 min)

1. In the Meta app dashboard: **WhatsApp** → **Configuration**.
2. Under **Webhook**, click **Edit**:
   - **Callback URL:** `https://<your-project>.vercel.app/api/webhook`
   - **Verify token:** your `WHATSAPP_VERIFY_TOKEN`
   - Click **Verify and save**. If it fails, see Troubleshooting below.
3. Under **Webhook fields**, click **Manage**, find **messages**, and turn on **Subscribe**.

### Step 5: Try it on your phone 🎉

From one of the verified phones, send a WhatsApp message to the test number:

```
Hi! What's the price of milk?
ನನ್ನ ಆರ್ಡರ್ ಎಲ್ಲಿದೆ?
Book a slot for HB-1046 tomorrow morning
naale haalu beda
Pause my milk from the 10th to the 15th
My eggs came broken, I want a refund      ← handover to you
BOT                                       ← back to the assistant
reset demo                                ← fresh sample data
```

**Human handover:** when the bot hands over, **your** phone (`OWNER_WHATSAPP_NUMBER`) gets an
alert from the test number. Reply from your phone like this:

```
/reply 919812345678 Sorry about that! A replacement is on the way.
/done 919812345678          ← gives the chat back to the bot
```

> **WhatsApp's 24-hour rule:** a business can only send free-form messages to someone who
> messaged it in the last 24 hours. So **send "hi" to the test number from the owner phone
> before each demo**, or handover alerts can't reach you. Customers always message first, so
> replies to them work.

### Step 6: Permanent token (do this before client demos)

The token from Step 2.4 expires within a day. A **system user** token doesn't expire:

1. Go to <https://business.facebook.com/settings> and pick your business portfolio.
2. **Users** → **System users** → **Add**. Name it `hasiru-bot` and give it the **Admin** role. Click **Create system user**.
3. Select it → **Assign assets**:
   - **Apps** → your app → turn on **Manage app** (full control).
   - **WhatsApp accounts** → your test WhatsApp account → turn on full control.
   - Click **Assign changes**.
4. Click **Generate token** → choose your app → **Token expiration: Never** → tick the permissions **whatsapp_business_messaging** and **whatsapp_business_management** → **Generate token**. Copy it.
5. In Vercel: **Settings → Environment Variables** → edit `WHATSAPP_TOKEN` → paste the new token → **Redeploy**.

### Step 7 (optional): Keep data between restarts (free Upstash Redis)

Without this, demo data lives in memory, and Vercel resets it whenever the function restarts
(often after about 10 minutes idle). Pauses, skips and booked slots then go back to the sample data.
For a quick demo that's fine. For reliable demos:

1. In Vercel: your project → **Storage** (or **Marketplace**) → **Upstash** → **Redis** → **Free** plan → connect it to this project.
2. Vercel adds the connection variables (`KV_REST_API_URL` / `KV_REST_API_TOKEN`, or `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`) automatically. The bot uses either pair.
3. **Redeploy.** `/api/health` should now show `storage: upstash-redis`.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Meta says **"The callback URL or verify token couldn't be validated"** | Check that `WHATSAPP_VERIFY_TOKEN` in Vercel matches exactly (no spaces), that you **redeployed** after adding it, and that you used the production URL ending in `/api/webhook`. Open `https://<project>.vercel.app/api/health` and check the setting shows `true`. |
| Bot doesn't reply at all | 1) Did you subscribe to the **messages** field (Step 4.3)? 2) Is your phone in the recipient list (Step 2.5)? 3) Check Vercel → your project → **Logs**. |
| Logs show `Invalid signature` (401) | `WHATSAPP_APP_SECRET` is wrong. Copy it again from App settings → Basic and redeploy. |
| Logs show `WhatsApp API HTTP 401` | The access token expired. Generate a new one, or better, do Step 6. |
| Logs show `WhatsApp API HTTP 400 … recipient` | That phone isn't in the test number's allowed list (Step 2.5). |
| Bot replies "Sorry, I'm having trouble…" | Groq error. Check the logs for `Groq HTTP …`: 401 means a wrong key, 429 means you hit the free rate limit (wait a minute). |
| Owner never gets handover alerts | Send "hi" from the owner phone to the test number (24-hour rule), and check `OWNER_WHATSAPP_NUMBER` is digits only with country code. |
| Pauses or bookings "forgotten" | Normal without Step 7: the function restarted. Add Upstash Redis. |
| Kannada replies are clumsy | Try another model via the `GROQ_MODEL` variable (see <https://console.groq.com/docs/models>), then redeploy. |

## Turning this into a client's bot

1. **Tailor the demo:** edit `lib/data.js`, which holds the store name, areas, fees, catalogue, sample orders and subscription. Change the name in `lib/agent.js` and the fixed messages in `lib/language.js`.
2. **Going live for a real business** is a separate project, and some parts aren't free:
   - The business needs its own phone number, Meta business verification, and approved message templates.
   - WhatsApp charges per conversation for some message types.
   - The tools must call the client's real order system instead of `lib/data.js`.

## Free-tier limits to know

- **WhatsApp test number:** it only messages your 5 verified numbers, and the business name shows as a test account.
- **Groq free plan:** it has per-minute and per-day request limits. That's plenty for demos, but not for real traffic.
- **Vercel Hobby:** it's for non-commercial use. When you start charging clients, move their bots to a paid plan or their own account.

## Security notes

- All secrets are read from environment variables. `.env` is git-ignored; only `.env.example` (with empty values) is committed.
- Every incoming webhook is checked with Meta's `X-Hub-Signature-256` HMAC when `WHATSAPP_APP_SECRET` is set.
- The AI can only act through tools bound to the sender's own phone number, so it can't see or change other customers' data.
- `/api/health` shows only `true`/`false` for each setting, never the values.
- Duplicate deliveries from Meta are ignored, so a retried webhook never double-skips a delivery.

## Development

```bash
npm test        # 18 offline tests (Groq and WhatsApp are mocked)
npm run chat    # live terminal chat (needs GROQ_API_KEY)
```
