# Etiquette Essentials — Invitation & Registration System

An elegant, production-ready event site for **Etiquette Essentials — An Upskill Workshop
for Professional and Social Etiquette** (Friday, 8 January 2027 · 9.00 AM – 12.00 PM ·
P1 Hall, Lyceum Campus, Nugegoda), with a complete registration system:

- **Invitation landing page** — hero, a concise *About the workshop* section, event
  details, ticket pricing (light/dark themes, fully responsive, mobile-first) in the
  **official ticket palette** (blush cream `#FDF0EA`, dusty rose `#A94E5C`, deep
  plum `#3B2029`, maroon `#692136`) with **watercolour flower decorations extracted
  from the official ticket** and the official Lyceum Campus logo in the header,
  invitation card and footer
- **Registration form** — ticket category (Rs. 700 students / Rs. 1,000 external),
  **unique payment reference per participant** (shown before paying so it goes on the
  bank transfer — makes matching slips to people trivial), payment-slip upload
  (**JPG / PNG / WebP images — auto-compressed — or PDF up to 3 MB**), and
  **Lyceum student-ID validation** (format `BEd-PE-26-05-0015`)
- **Telegram admin approval** — every registration alerts your admin group with
  ✅ Approve / ❌ Reject buttons (per the registration-system guide); the webhook that
  makes the buttons work is connected with **one click from the organizer console**
- **QR e-tickets via email** — approval generates a QR ticket and emails it (Resend),
  **with the official Canva-designed ticket attached as a PDF** — the participant's
  name is written on the design in script and their ticket number stamped in the box
  (student Rs. 700 design for Lyceum students, external Rs. 1,000 design otherwise)
- **Organizer console** (`/` → footer → *Organizer console*) — **password-protected**
  web fallback dashboard: live stats, approve/reject, slip viewer, ticket viewer
- **Entrance scanner** — camera QR scanning plus manual code entry
  (valid → green, already scanned → amber, unapproved/invalid → red)

Built with **Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 + shadcn/ui**.
Zero-cost hosting on **Vercel + Supabase + Telegram + Resend**.

---

## 1. Run locally (demo mode)

```bash
bun install        # or: npm install
bun run dev        # or: npm run dev
```

Without environment variables the app runs in **demo mode**: data lives in
`db/ee-demo-store.json` (in-memory-like, survives restarts) with sample registrations,
and Telegram/email sending is skipped. This is perfect for previewing the full flow —
register → approve in the console → scan at the "entrance".

> In production always configure the env vars below — demo mode keeps data on a
> local file that is not shared across serverless instances.

## 2. Production setup (Vercel)

### 2.1 Supabase — database & slip storage

1. Create a project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run:

```sql
CREATE TABLE registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reference_code VARCHAR UNIQUE NOT NULL,
  ticket_code VARCHAR UNIQUE NOT NULL,
  full_name VARCHAR NOT NULL,
  email VARCHAR NOT NULL,
  phone VARCHAR NOT NULL,
  category VARCHAR NOT NULL, -- 'Lyceum Campus Student' or 'External Participant'
  student_id VARCHAR,
  amount INT NOT NULL,
  slip_url TEXT NOT NULL,
  status VARCHAR DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  approved_by VARCHAR,
  checked_in BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ticket_code ON registrations(ticket_code);
```

3. In **Storage**, create a bucket named `slips` and make it **Public**
   (so slip images render inside Telegram messages and ticket emails).

### 2.2 Telegram — admin approval interface

1. Create a bot via [@BotFather](https://t.me/BotFather) → `/newbot` → copy the **Bot API Token**.
2. Create your admin group (e.g. *Etiquette Essentials Admins*), add the bot, promote it to **Admin**.
3. Get the **Group Chat ID** (usually starts with `-100…`) by adding [@myidbot](https://t.me/myidbot)
   to the group, or call `https://api.telegram.org/bot<TOKEN>/getUpdates`.

Bind the webhook **after** the Vercel deploy (section 2.4) — this is the step that makes
the **Approve / Reject buttons work**. Without it, registration alerts still arrive in
Telegram (those are pushed out by the site), but tapping the buttons does nothing because
Telegram has no way to deliver the button press back to your site.

**Easiest way — one click (recommended):** after deploying, open the **Organizer console**
on your deployed site → *Dashboard* → the **“Telegram approve buttons”** card at the top
shows the live status → click **Connect buttons**. Done — the card turns green. (The card
also shows the current webhook URL, any delivery errors, and works from the deployed site
only — Telegram can't reach `localhost`.)

**Manual way — no console needed:** open this URL in any browser
(replace `<TOKEN>` with the BotFather token and `<your-app>` with your Vercel domain):

```text
https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<your-app>.vercel.app/api/telegram-webhook
```

Optionally append `&secret_token=<same value as TELEGRAM_WEBHOOK_SECRET>` so the route
only accepts requests from Telegram. Verify with `https://api.telegram.org/bot<TOKEN>/getWebhookInfo`
— the `url` field should show your `/api/telegram-webhook` address and `last_error_message`
should stay empty.

### 2.3 Resend — ticket emails

1. Register at [resend.com](https://resend.com) → create an API key.
2. For real delivery, **verify your own domain** in Resend and set
   `EMAIL_FROM` to something like `Etiquette Essentials <tickets@yourdomain.com>`.
   (Until then the default `onboarding@resend.dev` only delivers to the account owner's
   own address — fine for testing.)

### 2.4 Vercel — hosting

1. Push this repository to GitHub.
2. In Vercel: **Add New → Project → Import** your repo.
3. Set the **Build Command** to `next build` (Framework preset: Next.js).
4. Add the environment variables (below) for Production.
5. Deploy — you get `https://<your-app>.vercel.app`.
6. Connect the Telegram approve buttons: open the **Organizer console** on the deployed
   site → *Dashboard* → **Connect buttons** (or run the manual setWebhook URL from
   section 2.2).

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key |
| `TELEGRAM_BOT_TOKEN` | ✅ | Bot token from @BotFather |
| `TELEGRAM_CHAT_ID` | ✅ | Admin group chat id (starts with `-100…`) |
| `RESEND_API_KEY` | ✅ | Ticket email delivery |
| `EMAIL_FROM` | – | Sender, e.g. `Etiquette Essentials <tickets@yourdomain.com>` |
| `NEXT_PUBLIC_BANK_NAME` | – | Bank name shown in the registration form's payment step |
| `NEXT_PUBLIC_ACCOUNT_NAME` | – | Account name shown in the registration form |
| `NEXT_PUBLIC_BANK_BRANCH` | – | Branch (optional row — hidden while unset) |
| `NEXT_PUBLIC_ACCOUNT_NUMBER` | – | Account number (with copy button) |
| `ADMIN_KEY` | ✅ | Password that unlocks the Organizer console (footer link). If unset, the default is **`etiquette2027`** — always set your own on Vercel |
| `TELEGRAM_WEBHOOK_SECRET` | – | If set, webhook verifies the `X-Telegram-Bot-Api-Secret-Token` header |
| `NEXT_PUBLIC_SITE_URL` | – | Final public address of the site (the one that does **not** redirect) — used by the Telegram webhook connector, e.g. `https://www.etiquetteworkshop.online` |

## 3. Configure your event

Everything the site displays comes from **`src/config/event.ts`** — dates, venue, prices,
organizer line, and:

- `payment` — the **bank account** participants pay into is read from the
  `NEXT_PUBLIC_BANK_*` environment variables (table above), so you can set or change
  it on Vercel without touching code. It is shown inside the registration form with a
  copy button. While unset, the form shows a "confirm with the committee" notice
  instead. (`contact` is still edited in this file — optional public email / phone,
  shown in the footer.)

**Student IDs.** Lyceum Campus students must type their ID in the official format
`BEd-PE-26-05-0015` (programme-specialisation-year-intake-serial). The pattern lives in
`src/lib/validation.ts` (`STUDENT_ID_RE`) — loosen it there if other programmes use a
different scheme.

**Branding.** The official logo files are `public/lyceum-logo.svg` (colour, light
surfaces) and `public/lyceum-logo-dark.svg` (all-white, dark surfaces) — replace these
files to update the logo everywhere. Colours are defined once in `src/app/globals.css`
(`--brand`, `--primary`, `--success`, …).

## 4. Day-to-day usage

| Step | Where | What happens |
| --- | --- | --- |
| Participant registers | Invitation → *Reserve your seat* | The form shows a **unique payment reference** (e.g. `EE-482913`) in the payment step — the participant adds it to their bank transfer, so the slip is easy to match. On submit: slip uploaded, record `pending`, Telegram alert with Approve/Reject buttons |
| Committee approves | Telegram (or console) | Status → `approved`, QR ticket **emailed** automatically — the Telegram alert shows the same payment reference that's printed on the slip |
| Participant arrives | Console → *Entrance scanner* | Scan the QR (or type the code) — first scan checks in, repeats show "already scanned" |

The organizer console (footer → *Organizer console*) is **password-protected**: enter
`ADMIN_KEY` (default `etiquette2027` if the variable is unset). The key is kept in
`sessionStorage` for the tab session — press **Lock console** or close the tab to sign
out. It mirrors the Telegram buttons as a web fallback and shows live stats. Approving
there also emails the ticket — no double-sending can occur.

**Three attempts only.** After 3 wrong passwords the login locks: the form is disabled
client-side and the APIs return `429` for that IP for 5 minutes — even if the next
password is correct. Wait a few minutes and reload the page to try again.

## 5. Testing checklist

- [ ] Submit a test registration with a sample payment receipt (student: use an ID like `BEd-PE-26-05-0015`) — try both an **image** slip and a **PDF** slip
- [ ] Check the payment step shows a unique **payment reference** (e.g. `EE-482913`) with a copy button — closing and reopening the form keeps the same number
- [ ] Try an invalid student ID (e.g. `BEd/2026/127`) — the form must reject it
- [ ] Confirm the slip file lands in the Supabase `slips` bucket
- [ ] Confirm the alert appears in your Telegram admin group
- [ ] In the organizer console, confirm the **Telegram approve buttons** card is green (Connected)
- [ ] Tap **✅ Approve** — the Telegram message updates to "APPROVED BY …"
- [ ] Check the participant's inbox for the QR ticket email — it must contain the QR code **and the attached personalised ticket PDF** (name written on the design, correct Rs. 700 / Rs. 1,000 variant for the category)
- [ ] Open the site on a phone → footer → *Organizer console* → enter the password → *Entrance scanner*
- [ ] Scan the QR from the email — green pass; scan again — amber "already scanned"
- [ ] Open the invitation on a phone (≈375 px) — header, cards and form must fit without horizontal scrolling

## 6. Troubleshooting

| Symptom | Fix |
| --- | --- |
| Vercel build fails on `cp: .next/standalone…` | Build Command must be `next build` (section 2.4) — the guarded script normally handles this automatically |
| Telegram alert missing | Check `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID`; group ids start with `-100`; the bot must be in the group |
| Approve button in Telegram does nothing | The webhook isn't bound. Open the **Organizer console** → *Dashboard* → the "Telegram approve buttons" card → **Connect buttons**. (Alerts arrive without the webhook, but buttons need it — see section 2.2.) Check `getWebhookInfo` for `last_error_message` if it was connected but fails |
| Last delivery error: **308 Permanent Redirect** | The webhook is registered on an address that redirects — most often the **non-www** domain while Vercel treats **www** as primary (or a trailing slash / `http://`). Telegram never follows redirects; it needs a direct `200 OK`. Fix: open the console on the final address (the one the browser lands on, e.g. `https://www.yourdomain.com`) and press **Connect buttons** again. To make it permanent, set `NEXT_PUBLIC_SITE_URL` to that final address in Vercel. The console card now detects and explains this automatically |
| Ticket email not arriving | `RESEND_API_KEY` set? Domain verified in Resend? Check the recipient's spam; `onboarding@resend.dev` only reaches the account owner |
| Slip images not loading in Telegram | The `slips` bucket must be **Public** |
| PDF slip won't upload | PDFs are capped at **3 MB** (images up to 20 MB — they get compressed). Re-export or screenshot the slip if it's bigger |
| Console says "Incorrect password" | Enter the value of `ADMIN_KEY`; if the variable is unset the password is `etiquette2027` |
| Console locked after wrong passwords | By design — 3 wrong attempts lock the console for 5 minutes (form disabled + `429`); wait and reload the page |
| Ticket email arrives without the designed PDF attachment | The designed bases/fonts live in `public/tickets/` — make sure they are deployed (they ship in the repo zip; `outputFileTracingIncludes` covers the serverless functions). The email itself still works — the attachment is skipped gracefully if the assets are missing. Also check the Vercel function logs for `[ticket-pdf] generation failed` |
| Duplicate approvals | Safe by design — approving an already-approved ticket just re-shows it; no second email |

## 7. Implementation notes

- **Why Supabase (not Prisma/SQLite)?** Vercel's serverless filesystem is read-only —
  SQLite cannot persist there. Supabase (free tier) gives you Postgres + file storage,
  exactly as the original registration-system guide specifies.
- **Email QR images** are uploaded to the public `slips` bucket as PNGs and referenced by
  URL — Gmail and most clients strip `data:` URI images.
- **Slip uploads**: images are downscaled to ≤1600 px and re-encoded (JPEG q≈0.85)
  **in the browser** before submission; **PDF slips** (≤3 MB) are passed through
  as-is — the server additionally verifies the `%PDF-` magic bytes. Both keep the
  JSON payload far below Vercel's 4.5 MB request-body limit. In the organizer
  console, image slips open in an image viewer while PDF slips render in an
  embedded PDF viewer (with an *Open in a new tab* link).
- **Codes**: reference `EE-XXXXXX`, ticket `TKT-XXXXXXX` (unique-constrained in Postgres,
  with retry logic in the store layer).
- **Designed ticket PDFs**: the two Canva ticket designs (student Rs. 700 / external
  Rs. 1,000) were extracted from the organisers' export and rebuilt as single-page
  base PDFs in `public/tickets/` (300-DPI, ~0.5 MB each). At approval,
  `src/lib/ticket-pdf.ts` stamps the participant's name (Allura script, deep maroon,
  auto-shrunk to fit the dotted line) and ticket code (PT Serif Bold, matching the
  label grey) onto the design matching their category, and attaches the result to the
  ticket email via `pdf-lib` + `@pdf-lib/fontkit`. If the assets are missing the
  attachment is simply skipped — the QR email never fails because of it.
- The unused Prisma scaffold files (`prisma/`, `db/custom.db`) are left in place and can
  be deleted; nothing imports them.
