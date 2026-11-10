# Creating the HighLevel Marketplace listings

Values below use `https://app-package-1.vercel.app`. If your Vercel domain is different, open `/admin` on your deployment: it shows the same values with your real domain (or run `node scripts/listing-guide.js https://your-domain > SETUP-HIGHLEVEL.md`).

Do this once per app at **marketplace.gohighlevel.com** (developer portal) → **My Apps** → **Create App**. After each app, paste its three keys into Vercel (step 5) and redeploy.

| Profile | Apps |
| --- | --- |
| Current profile | Lead Scorer, Round Robin Pro |
| Other profile | Contact Cleaner, After-Hours Responder, Birthday Greeter, Intent Radar |

---

## 🔥 Lead Scorer

**1. Create App**
- App name: `Lead Scorer`
- App type: **Public**
- Target user: **Sub-account**
- Who can install: **Both Agency & Sub-account** (bulk agency installs work)

**2. Profile / listing**
- Tagline: Know which leads are hot, automatically.
- Description: Scores every contact from what they actually do (replies, bookings, opportunities and wins), writes the score to a "Lead Score" field and tags each contact cold, warm or hot so your workflows and team can act on it.
- Key features:
  - **Live score on every contact**: A "Lead Score" number field is created for you and updated on every reply, booking and deal.
  - **Cold / warm / hot tags**: Tags switch automatically as the score crosses your thresholds. Trigger any workflow from them.
  - **Your own point rules**: Choose how many points each action is worth and cap message points per day.
  - **Zero setup**: Install, open the app, and scoring starts with sensible defaults.
- Website: `https://app-package-1.vercel.app/lead-scorer`
- Documentation: `https://app-package-1.vercel.app/lead-scorer/docs`
- Support: `https://app-package-1.vercel.app/lead-scorer/support`
- Privacy policy: `https://app-package-1.vercel.app/lead-scorer/privacy`
- Terms of service: `https://app-package-1.vercel.app/lead-scorer/terms`

**3. Advanced Settings → Auth**
- Scopes: `contacts.readonly`, `contacts.write`, `locations.readonly`, `locations/customFields.readonly`, `locations/customFields.write`
- Redirect URL: `https://app-package-1.vercel.app/lead-scorer/oauth/callback`
- Client Keys → **Add**: copy the **Client ID** and **Client Secret**.
- SSO → **Shared Secret**: generate and copy it.

**4. Webhooks and custom page**
- Default Webhook URL: `https://app-package-1.vercel.app/lead-scorer/webhook`
- Events: `INSTALL`, `UNINSTALL`, `ContactCreate`, `ContactDelete`, `InboundMessage`, `AppointmentCreate`, `OpportunityCreate`, `OpportunityStatusUpdate`
- Custom Page (left-menu link) → Live URL: `https://app-package-1.vercel.app/lead-scorer/embed`, name it `Lead Scorer`

**5. Vercel** → Project → Settings → Environment Variables (Production), then Redeploy:
```
LEAD_SCORER_CLIENT_ID=<Client ID>
LEAD_SCORER_CLIENT_SECRET=<Client Secret>
LEAD_SCORER_SSO_KEY=<Shared Secret>
```

**6. Test**: install it into a test sub-account from the listing’s install link, open it from the left menu, and check `https://app-package-1.vercel.app/health` shows `"configured": true, "sso": true` for `lead-scorer`. Then submit for review.

---

## 🔄 Round Robin Pro

**1. Create App**
- App name: `Round Robin Pro`
- App type: **Public**
- Target user: **Sub-account**
- Who can install: **Both Agency & Sub-account** (bulk agency installs work)

**2. Profile / listing**
- Tagline: Share every new lead fairly across your team.
- Description: Assigns new contacts and opportunities to your team in a weighted rotation, the moment they arrive. Give your closers more, pause someone on holiday with one click, and keep each lead with one rep.
- Key features:
  - **Weighted rotation**: Weight 3 gets three leads for every one at weight 1, spread evenly, never in clumps.
  - **Contacts and opportunities**: Assign either or both. Opportunities follow the contact’s owner so a lead keeps one rep.
  - **Tag filter**: Only rotate leads with a tag (e.g. from one funnel) and leave the rest alone.
  - **Pause in one click**: Set someone to 0 while they are away. No workflow edits.
- Website: `https://app-package-1.vercel.app/round-robin`
- Documentation: `https://app-package-1.vercel.app/round-robin/docs`
- Support: `https://app-package-1.vercel.app/round-robin/support`
- Privacy policy: `https://app-package-1.vercel.app/round-robin/privacy`
- Terms of service: `https://app-package-1.vercel.app/round-robin/terms`

**3. Advanced Settings → Auth**
- Scopes: `contacts.readonly`, `contacts.write`, `opportunities.readonly`, `opportunities.write`, `users.readonly`, `locations.readonly`
- Redirect URL: `https://app-package-1.vercel.app/round-robin/oauth/callback`
- Client Keys → **Add**: copy the **Client ID** and **Client Secret**.
- SSO → **Shared Secret**: generate and copy it.

**4. Webhooks and custom page**
- Default Webhook URL: `https://app-package-1.vercel.app/round-robin/webhook`
- Events: `INSTALL`, `UNINSTALL`, `ContactCreate`, `OpportunityCreate`
- Custom Page (left-menu link) → Live URL: `https://app-package-1.vercel.app/round-robin/embed`, name it `Round Robin Pro`

**5. Vercel** → Project → Settings → Environment Variables (Production), then Redeploy:
```
ROUND_ROBIN_CLIENT_ID=<Client ID>
ROUND_ROBIN_CLIENT_SECRET=<Client Secret>
ROUND_ROBIN_SSO_KEY=<Shared Secret>
```

**6. Test**: install it into a test sub-account from the listing’s install link, open it from the left menu, and check `https://app-package-1.vercel.app/health` shows `"configured": true, "sso": true` for `round-robin`. Then submit for review.

---

## 🧹 Contact Cleaner

**1. Create App**
- App name: `Contact Cleaner`
- App type: **Public**
- Target user: **Sub-account**
- Who can install: **Both Agency & Sub-account** (bulk agency installs work)

**2. Profile / listing**
- Tagline: Clean data in, every single time.
- Description: Fixes every new contact the moment it is created: proper-case names, lower-case emails and +E.164 phone numbers, then tags possible duplicates and junk sign-ups so your list, your SMS deliverability and your reports stay clean.
- Key features:
  - **Proper names**: "jOHN SMITH" becomes "John Smith" so merge fields look professional.
  - **Phones that text**: Local numbers become +E.164 using your default country, so SMS sends and duplicates match.
  - **Duplicate alerts**: New contacts sharing an email or phone with an existing one are tagged with a note linking the original.
  - **Junk filter**: Test names, throwaway email domains and fake phone numbers are tagged for review.
- Website: `https://app-package-1.vercel.app/contact-cleaner`
- Documentation: `https://app-package-1.vercel.app/contact-cleaner/docs`
- Support: `https://app-package-1.vercel.app/contact-cleaner/support`
- Privacy policy: `https://app-package-1.vercel.app/contact-cleaner/privacy`
- Terms of service: `https://app-package-1.vercel.app/contact-cleaner/terms`

**3. Advanced Settings → Auth**
- Scopes: `contacts.readonly`, `contacts.write`, `locations.readonly`
- Redirect URL: `https://app-package-1.vercel.app/contact-cleaner/oauth/callback`
- Client Keys → **Add**: copy the **Client ID** and **Client Secret**.
- SSO → **Shared Secret**: generate and copy it.

**4. Webhooks and custom page**
- Default Webhook URL: `https://app-package-1.vercel.app/contact-cleaner/webhook`
- Events: `INSTALL`, `UNINSTALL`, `ContactCreate`
- Custom Page (left-menu link) → Live URL: `https://app-package-1.vercel.app/contact-cleaner/embed`, name it `Contact Cleaner`

**5. Vercel** → Project → Settings → Environment Variables (Production), then Redeploy:
```
CONTACT_CLEANER_CLIENT_ID=<Client ID>
CONTACT_CLEANER_CLIENT_SECRET=<Client Secret>
CONTACT_CLEANER_SSO_KEY=<Shared Secret>
```

**6. Test**: install it into a test sub-account from the listing’s install link, open it from the left menu, and check `https://app-package-1.vercel.app/health` shows `"configured": true, "sso": true` for `contact-cleaner`. Then submit for review.

---

## 🌙 After-Hours Responder

**1. Create App**
- App name: `After-Hours Responder`
- App type: **Public**
- Target user: **Sub-account**
- Who can install: **Both Agency & Sub-account** (bulk agency installs work)

**2. Profile / listing**
- Tagline: Never leave a lead on read after closing time.
- Description: Replies instantly to SMS, WhatsApp, email, Facebook, Instagram, Google and web-chat messages that arrive outside business hours or on holidays, on the same channel, telling the lead exactly when you will be back.
- Key features:
  - **Every channel**: SMS, WhatsApp, email, Facebook, Instagram, Google Business and the chat widget, each switchable.
  - **Knows when you open**: {{next_open}} becomes "tomorrow at 9 AM" or "on Monday at 10 AM" from your hours and holidays.
  - **Polite by design**: One reply per contact per cooldown, skips DND and contacts with your opt-out tag.
  - **Call-back list**: Tags everyone who wrote after hours so your team starts the day with them.
- Website: `https://app-package-1.vercel.app/after-hours`
- Documentation: `https://app-package-1.vercel.app/after-hours/docs`
- Support: `https://app-package-1.vercel.app/after-hours/support`
- Privacy policy: `https://app-package-1.vercel.app/after-hours/privacy`
- Terms of service: `https://app-package-1.vercel.app/after-hours/terms`

**3. Advanced Settings → Auth**
- Scopes: `contacts.readonly`, `contacts.write`, `conversations.readonly`, `conversations.write`, `conversations/message.readonly`, `conversations/message.write`, `locations.readonly`
- Redirect URL: `https://app-package-1.vercel.app/after-hours/oauth/callback`
- Client Keys → **Add**: copy the **Client ID** and **Client Secret**.
- SSO → **Shared Secret**: generate and copy it.

**4. Webhooks and custom page**
- Default Webhook URL: `https://app-package-1.vercel.app/after-hours/webhook`
- Events: `INSTALL`, `UNINSTALL`, `InboundMessage`
- Custom Page (left-menu link) → Live URL: `https://app-package-1.vercel.app/after-hours/embed`, name it `After-Hours Responder`

**5. Vercel** → Project → Settings → Environment Variables (Production), then Redeploy:
```
AFTER_HOURS_CLIENT_ID=<Client ID>
AFTER_HOURS_CLIENT_SECRET=<Client Secret>
AFTER_HOURS_SSO_KEY=<Shared Secret>
```

**6. Test**: install it into a test sub-account from the listing’s install link, open it from the left menu, and check `https://app-package-1.vercel.app/health` shows `"configured": true, "sso": true` for `after-hours`. Then submit for review.

---

## 🎂 Birthday Greeter

**1. Create App**
- App name: `Birthday Greeter`
- App type: **Public**
- Target user: **Sub-account**
- Who can install: **Both Agency & Sub-account** (bulk agency installs work)

**2. Profile / listing**
- Tagline: A personal birthday message for every contact, every year.
- Description: Sends each contact a personal birthday SMS and/or email on the day, in your account’s time zone, and tags them for 24 hours so your workflows can add a coupon or a call task. Set it once, delight customers forever.
- Key features:
  - **Automatic every day**: Runs daily in your time zone. Leap-day birthdays are greeted on Feb 28.
  - **SMS, email or both**: Personal merge fields: first name, business name, even their new age.
  - **Workflow-ready tag**: "birthday-today" is added on the day and removed the next, so any workflow can react.
  - **One-click import**: Index the birthdays of the contacts you already have; new and edited contacts are tracked live.
- Website: `https://app-package-1.vercel.app/birthday-greeter`
- Documentation: `https://app-package-1.vercel.app/birthday-greeter/docs`
- Support: `https://app-package-1.vercel.app/birthday-greeter/support`
- Privacy policy: `https://app-package-1.vercel.app/birthday-greeter/privacy`
- Terms of service: `https://app-package-1.vercel.app/birthday-greeter/terms`

**3. Advanced Settings → Auth**
- Scopes: `contacts.readonly`, `contacts.write`, `conversations.readonly`, `conversations.write`, `conversations/message.readonly`, `conversations/message.write`, `locations.readonly`
- Redirect URL: `https://app-package-1.vercel.app/birthday-greeter/oauth/callback`
- Client Keys → **Add**: copy the **Client ID** and **Client Secret**.
- SSO → **Shared Secret**: generate and copy it.

**4. Webhooks and custom page**
- Default Webhook URL: `https://app-package-1.vercel.app/birthday-greeter/webhook`
- Events: `INSTALL`, `UNINSTALL`, `ContactCreate`, `ContactUpdate`, `ContactDelete`
- Custom Page (left-menu link) → Live URL: `https://app-package-1.vercel.app/birthday-greeter/embed`, name it `Birthday Greeter`

**5. Vercel** → Project → Settings → Environment Variables (Production), then Redeploy:
```
BIRTHDAY_GREETER_CLIENT_ID=<Client ID>
BIRTHDAY_GREETER_CLIENT_SECRET=<Client Secret>
BIRTHDAY_GREETER_SSO_KEY=<Shared Secret>
```

**6. Test**: install it into a test sub-account from the listing’s install link, open it from the left menu, and check `https://app-package-1.vercel.app/health` shows `"configured": true, "sso": true` for `birthday-greeter`. Then submit for review.

---

## 📡 Intent Radar

**1. Create App**
- App name: `Intent Radar`
- App type: **Public**
- Target user: **Sub-account**
- Who can install: **Both Agency & Sub-account** (bulk agency installs work)

**2. Profile / listing**
- Tagline: Know what every lead wants the second they reply.
- Description: Reads every inbound SMS, email, chat and social message and spots buying signals, price questions, booking requests, complaints, cancellation risk, opt-outs, urgency and competitor mentions. It tags the contact, notes why, and creates a task for the owner when a human is needed fast.
- Key features:
  - **Buying signals, instantly**: "Send me the invoice" or "how do I get started" tags the lead intent-buying and creates a task for the owner.
  - **Save customers before they leave**: Complaints and cancellation talk are flagged with the exact quote, so you can call before it is too late.
  - **Respect opt-outs**: "Stop texting me" is tagged intent-opt-out and never triggers sales follow-up.
  - **Your words, too**: Add competitor names and your own phrases for any intent. No AI key, no per-message fees, and every match is explained.
- Website: `https://app-package-1.vercel.app/intent-radar`
- Documentation: `https://app-package-1.vercel.app/intent-radar/docs`
- Support: `https://app-package-1.vercel.app/intent-radar/support`
- Privacy policy: `https://app-package-1.vercel.app/intent-radar/privacy`
- Terms of service: `https://app-package-1.vercel.app/intent-radar/terms`

**3. Advanced Settings → Auth**
- Scopes: `contacts.readonly`, `contacts.write`, `conversations.readonly`, `conversations/message.readonly`, `locations.readonly`
- Redirect URL: `https://app-package-1.vercel.app/intent-radar/oauth/callback`
- Client Keys → **Add**: copy the **Client ID** and **Client Secret**.
- SSO → **Shared Secret**: generate and copy it.

**4. Webhooks and custom page**
- Default Webhook URL: `https://app-package-1.vercel.app/intent-radar/webhook`
- Events: `INSTALL`, `UNINSTALL`, `InboundMessage`
- Custom Page (left-menu link) → Live URL: `https://app-package-1.vercel.app/intent-radar/embed`, name it `Intent Radar`

**5. Vercel** → Project → Settings → Environment Variables (Production), then Redeploy:
```
INTENT_RADAR_CLIENT_ID=<Client ID>
INTENT_RADAR_CLIENT_SECRET=<Client Secret>
INTENT_RADAR_SSO_KEY=<Shared Secret>
```

**6. Test**: install it into a test sub-account from the listing’s install link, open it from the left menu, and check `https://app-package-1.vercel.app/health` shows `"configured": true, "sso": true` for `intent-radar`. Then submit for review.
