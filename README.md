# App Package 1: 6 HighLevel Marketplace apps, one domain

Six separate HighLevel Marketplace apps (Target User: **Sub-account**), each sold on its own for **$97**, all served by **one Vercel project** (one serverless function, free Hobby plan) on **one domain**, each under its own path.

| App | Path | What it does | Webhook events |
| --- | --- | --- | --- |
| 🔥 **Lead Scorer** | `/lead-scorer` | Scores contacts from replies, bookings, opportunities and wins; writes a "Lead Score" field; tags cold / warm / hot | ContactCreate, ContactDelete, InboundMessage, AppointmentCreate, OpportunityCreate, OpportunityStatusUpdate |
| 🔄 **Round Robin Pro** | `/round-robin` | Weighted assignment of new contacts and opportunities across the team | ContactCreate, OpportunityCreate |
| 🧹 **Contact Cleaner** | `/contact-cleaner` | Proper-case names, lower-case emails, +E.164 phones; tags possible duplicates and junk sign-ups | ContactCreate |
| 🌙 **After-Hours Responder** | `/after-hours` | Instant reply on the same channel outside business hours / on holidays, with "we're back tomorrow at 9 AM" | InboundMessage |
| 🎂 **Birthday Greeter** | `/birthday-greeter` | Daily birthday SMS/email + a one-day `birthday-today` tag for workflows | ContactCreate, ContactUpdate, ContactDelete |
| 📡 **Intent Radar** | `/intent-radar` | Reads every inbound message for buying signals, price questions, booking requests, complaints, churn risk, opt-outs, urgency and competitor mentions; tags, notes and creates owner tasks. No AI key needed | InboundMessage |

## URLs

Customer-facing pages never mention HighLevel, agencies or sub-accounts (they say "your CRM" and "your account"), so they suit white-labelled CRMs. The Marketplace listing values are only on the password-protected `/admin` page.

Shared: `/` (catalog of all 5), `/privacy` and `/terms` (covering all 5), `/health`, `/admin` (Super Admin, `ADMIN_PASSWORD`).

Per app (replace `<slug>`):

| Marketplace field | Value |
| --- | --- |
| Website / support URL | `https://<domain>/<slug>` |
| Documentation | `https://<domain>/<slug>/docs` |
| Redirect URL | `https://<domain>/<slug>/oauth/callback` |
| Webhook URL | `https://<domain>/<slug>/webhook` |
| Custom Page (Live URL, sidebar) | `https://<domain>/<slug>/embed` |
| Privacy / Terms | `https://<domain>/privacy`, `https://<domain>/terms` |

## Setting up the Marketplace listings

Step-by-step, click by click: [`SETUP-HIGHLEVEL.md`](SETUP-HIGHLEVEL.md). Summary:

For each app in the HighLevel developer portal (marketplace.gohighlevel.com):

1. **Create app**: Target User *Sub-account*, distribution *Agency and Sub-account* (bulk agency installs are supported).
2. **Pricing**: paid, $97 (monthly or one-time, your choice in the portal; `PRICE_LABEL` sets the text on the landing page). HighLevel handles billing; the app runs only while installed.
3. **Auth**: add the Redirect URL and the scopes. `/admin` lists every value for each app, filled in with your domain. Create a client ID/secret and the SSO **Shared Secret**.
4. **Webhooks**: the Webhook URL, plus the events in the table above (and INSTALL / UNINSTALL).
5. **Custom page**: the Live URL `/<slug>/embed`. It signs the user in with HighLevel SSO and shows the settings; admins can edit, other users see them read-only.
6. Put the three values into Vercel as `<PREFIX>_CLIENT_ID`, `<PREFIX>_CLIENT_SECRET`, `<PREFIX>_SSO_KEY` (prefixes: `LEAD_SCORER`, `ROUND_ROBIN`, `CONTACT_CLEANER`, `AFTER_HOURS`, `BIRTHDAY_GREETER`, `INTENT_RADAR`). `/health` shows which apps are configured.

## Deploy on Vercel (free)

1. **Import**: [vercel.com/new](https://vercel.com/new) → import `rayad-naif/App-Package-1` → Framework Preset *Other* → add two environment variables: `ADMIN_PASSWORD` (10+ characters, for `/admin`) and `CRON_SECRET` (any long random text) → **Deploy**. The first deploy shows "not configured yet" until step 2.
2. **Database (Vercel's own, free)**: in the project, *Storage* → *Create Database* → **Upstash for Redis** (Free plan) → *Connect* to the project (all environments). Vercel adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` automatically. Then *Deployments* → ⋯ → **Redeploy**.
3. Open `https://<project>.vercel.app/health`: it should say `"database": "ok (redis)"`. Optional: add your own domain in *Settings → Domains* and set `BASE_URL` to it (then redeploy).
4. Open `/admin` (your `ADMIN_PASSWORD`) for the exact values to paste into each HighLevel listing.

No `SESSION_SECRET` is needed: the app creates a random one on first start and keeps it in the database (set `SESSION_SECRET`, 32+ characters, if you prefer to manage it yourself). MongoDB still works too: set `MONGODB_URI` instead of adding Upstash.

The daily job (`/api/cron/daily`, birthdays) is scheduled in `vercel.json` at 15:07 UTC; `CRON_SECRET` makes sure only Vercel can call it.

### Free-plan notes

- **One function**: the whole suite is a single Express function, well inside the Hobby limits (it never needs more than one).
- **Cron**: Hobby runs cron jobs once a day, so birthday messages go out once a day (~15:00 UTC), dated in each sub-account's time zone. Each run has a 50 s budget; sub-accounts that were not reached are first in line the next day.
- **Function timeout**: 60 s (`vercel.json`). Webhooks finish in well under a second each.
- **Commercial use**: Vercel's Hobby plan is for non-commercial use. Paid apps are commercial, so plan to move to Pro (or another host) once you have paying customers. Nothing in the code changes.

## How it works

- `src/suite.js`: one Express app; routes `/<slug>/...` to the right app definition. Webhooks are de-duplicated (HighLevel retries) and processed before replying (serverless functions freeze after the response).
- `src/ghl.js`: OAuth per app (each listing has its own credentials), location tokens with automatic refresh (safe under concurrent refreshes), agency bulk installs (location tokens minted from the agency token), webhook signature checks.
- `src/apps/*.js`: one file per app: listing text, scopes, events, a settings schema, and `onEvent` / `daily` handlers. The settings page inside the CRM is generated from the schema.
- `src/store.js`: Upstash Redis (REST, no driver) or MongoDB: installs, agency tokens, a 30-day activity log, and small TTL'd working data (counters, cooldowns, the birthday index). Tokens are stored AES-256-GCM encrypted.
- **Free-tier usage**: Upstash's free plan includes 500,000 commands a month; a webhook costs about 5–10, so roughly 50,000+ events a month before you need to upgrade.
- Unsigned UNINSTALL webhooks are only trusted after HighLevel refuses the stored token; set `GHL_WEBHOOK_ED25519_KEY` to reject unsigned webhooks outright.

## Adding another app

Create `src/apps/<name>.js` exporting `slug`, `envPrefix`, `name`, `icon`, `color`, `tagline`, `description`, `features`, `scopes`, `webhookEvents`, `fields`, `onEvent` (optionally `daily`, `options`, `actions`), and add it to `src/apps/index.js`.

## Development

```bash
npm install
cp .env.example .env   # no database set = in-memory store
npm start              # http://localhost:3000
npm test
```
