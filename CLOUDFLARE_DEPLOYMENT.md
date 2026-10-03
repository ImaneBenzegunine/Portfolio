# Cloudflare deployment: launch now, connect a domain later

## Current production setup: Gmail delivery

The live project is `imanebenzegunine` at https://imanebenzegunine.pages.dev.
`wrangler.toml` defines its production D1 binding and contact settings; preview
contact remains disabled. The public email is also a source-code default.

Deploy the delivery worker using `cloudflare/wrangler.gmail.jsonc`, not the older
Formcarry/native-email configurations below. It authenticates to Gmail over TLS
on port 465 and retains the visitor address as Reply-To. `SMTP_USER` and
`SMTP_PASS` must be encrypted Worker secrets; never commit the local `.env`.
Pages separately requires an encrypted `RATE_LIMIT_SALT` of at least 32 characters.

The worker refreshes its readiness heartbeat only after Gmail authentication.
Unsent inquiries stay in D1 for seven days, with bounded retries. A successful
send removes the inquiry from the queue; Gmail inbox/spam delivery must still be
checked separately. SMTP retries can duplicate a message after an uncertain
connection failure. The worker has no public endpoint.

For updates:

```sh
npm run typecheck
npm run test:cloudflare
npx wrangler deploy --config cloudflare/wrangler.gmail.jsonc
```

Build the frontend with `VITE_SITE_URL=https://imanebenzegunine.pages.dev`, then
deploy `dist` to Pages. Commit `wrangler.toml` with the source so future Git builds
keep the production bindings. Verify `/api/config` returns HTTP 200 with email
mode before considering contact delivery active.

The sections below describe the previous alternative deployment plans.

Nothing has been deployed, purchased, connected to DNS, or emailed by this change.
The Docker Compose/Nginx/SQLite/SMTP deployment remains available for local use.

## Path A ? launch now on pages.dev

You do not need to own `imanebenzegunine.com`. Do not configure that hostname as
canonical until you own it and its Pages custom domain is active.

### Why Formcarry is usable here

Checked against official documentation on 2026-09-29:

- [Free Baby plan](https://formcarry.com/pricing): one form, 50 submissions/month,
  marketed for small projects/businesses, not restricted to testing.
- [Supported clients and formats](https://formcarry.com/): any client capable of
  HTTP, including mobile apps, and JSON/FormData. This supports the Worker using
  the public submission endpoint; it does not require the separate management API.
  There is no documented browser-only restriction. No custom sending domain is needed.
- [Self Email Notifications](https://docs.formcarry.com/features/self-email-notifications)
  are available on every plan. They are configured by the account owner, not the request.
- [Reply-To](https://docs.formcarry.com/getting-deeper/reply-to) uses the `email` field.
- [Official JSON example](https://formcarry.com/form/nextjs-contact-form) checks both
  HTTP success and `code === 200`. The Worker does the same.
- [Terms](https://formcarry.com/legal/terms-of-service) allow one free account and
  require compliance with API limits; no credit card is required for free accounts.

These documents support production use of this integration. They do not establish
that your account notifications are enabled or Gmail delivery works. That requires
an owner-authorized live test; automated checks here mock the provider and send no email.

### 1. Publish the website with contact safely disabled

Commit and push the reviewed files yourself. Cloudflare dashboard ? Workers & Pages
? Create application ? Pages ? Connect to Git / Import an existing repository.
Authorize access to the private `ImaneBenzegunine/Portfolio` repository.

| Pages setting | Value |
| --- | --- |
| Project name | `imane-portfolio`, if available, otherwise your chosen name |
| Production branch | `main` (or your actual release branch) |
| Framework preset | `None` |
| Root directory | Leave blank (repository root) |
| Build command | `npm run build` |
| Build output | `dist` |
| Build system | Current/v3 |
| Environment variable `NODE_VERSION` | `24` |
| Environment variable `VITE_CV_AVAILABLE` | `false` |
| Environment variable `CONTACT_ENABLED` | `false` |
| `VITE_PUBLIC_EMAIL` | Unset |
| `VITE_SITE_URL` for first build | Omit; build uses Cloudflare's `CF_PAGES_URL` |

After Cloudflare assigns the hostname, go to project ? Settings ? Variables and
Secrets ? Production. Set **`VITE_SITE_URL=https://<actual-project>.pages.dev`**,
replacing `<actual-project>` with the assigned name, without angle brackets or a
trailing slash. For example, **only if assigned** `imane-portfolio.pages.dev`, enter
`https://imane-portfolio.pages.dev`. Then Deployments ? latest production deployment
? Retry deployment. A new Git push also rebuilds. Build variables are baked into
canonical links, sitemap, Open Graph URLs and the sharing-image URL: saving the
variable alone does not update them. First-build `CF_PAGES_URL` may be a deployment
hostname; the explicit stable URL is the final production setting.

For Preview, keep `CONTACT_ENABLED=false`, omit production bindings/secrets, and
leave `VITE_SITE_URL` unset to use its own deployment URL. Set runtime compatibility
date `2026-09-27`, no flags, and Functions failure mode **Fail closed**.

All 22 routes are prerendered. `dist/404.html` produces actual Pages HTTP 404s;
`dist/404/index.html` still serves Nginx. No SPA wildcard rewrite is used. Static
security headers come from `_headers`; API responses set their own headers.
Only `/api/*` invokes Functions. Themes and local assets remain unchanged. The CV
stays disabled until a real PDF is supplied and its build flag explicitly enabled.

[Build variables](https://developers.cloudflare.com/pages/configuration/build-configuration/),
[build image](https://developers.cloudflare.com/pages/configuration/build-image/).

### 2. Create and configure Formcarry

1. Sign up at https://app.formcarry.com using your account. Complete account/email
   verification if prompted. Choose **Baby / Free ($0)**, not a paid trial or upgrade.
2. Dashboard ? **Create Form** ? name it `Portfolio contact`. Dedicate this form
   and its free allowance to this Worker; do not submit directly from another site.
3. Form ? **Setup** ? copy `https://formcarry.com/s/YOUR_FORM_ID`. Only the last
   segment is needed for the Worker secret `FORMCARRY_FORM_ID`.
4. Form ? **Settings ? Self email notification** ? turn the toggle **on**, add your
   private Gmail as recipient, and **Save**. Complete any recipient verification
   email the dashboard requests. Keep the standard provider sender/template.
   No Gmail password, SMTP password, API token or custom domain is needed.
5. Leave Respondent Email Notifications/autoresponses off. The visitor `email`
   field automatically supplies Reply-To for your notification.
6. Keep the provider spam filter enabled. Check its Spam view: spam counts toward
   quota and by default does not generate a notification. Do not require a browser
   CAPTCHA or an Origin/Referer restriction on this server-to-server endpoint;
   this Worker sends neither browser proof nor a forged browser Origin.

The endpoint ID is not a provider authentication token, but keep it encrypted and
server-side to reduce direct abuse. It must never appear in `VITE_` variables or Git.
Your Gmail belongs only in Formcarry settings, not in this repository.

### 3. Create D1 and the scheduled Worker

Stay on **Workers Free**. Dashboard ? Storage & databases ? D1 ? Create database ?
name **`portfolio-contact`**. Copy its database ID into `database_id` in
`cloudflare/wrangler.worker.jsonc`. IDs are not secrets. Leave replication off.
From the repository root, run these yourself when ready to configure the account:

```sh
npm ci
npx wrangler login
npx wrangler d1 migrations apply portfolio-contact --remote --config cloudflare/wrangler.worker.jsonc
npx wrangler deploy --config cloudflare/wrangler.worker.jsonc
npx wrangler secret put FORMCARRY_FORM_ID --config cloudflare/wrangler.worker.jsonc
```

Migrations 0001 and 0002 create the queue, rate counters, Worker heartbeat/pause and
outgoing-attempt ledger. Existing installations must apply 0002 too. Secret entry
is interactive: paste only the form ID. The initial deployment is disabled.

Change `DELIVERY_ENABLED` to `"true"` in `cloudflare/wrangler.worker.jsonc`, retaining
`DELIVERY_PROVIDER="formcarry"`, then run the same `wrangler deploy` command again.
The Worker is `portfolio-contact-delivery`, binds `CONTACT_DB` to this D1, has cron
`* * * * *`, and has no public URL or email binding. Pages Git builds do **not**
deploy this separate Worker. In its Settings ? Trigger Events confirm the cron;
propagation may take several minutes. Retain config changes for future deployments.

### 4. Enable the Pages API

Pages project ? Settings ? Bindings / Variables and Secrets ? **Production**:

| Type | Name | Value |
| --- | --- | --- |
| D1 binding | `CONTACT_DB` | Select `portfolio-contact` (same as Worker) |
| Variable | `PUBLIC_ORIGIN` | Exact `https://<actual-project>.pages.dev` |
| Variable | `DELIVERY_PROVIDER` | `formcarry` |
| Variable | `RETENTION_DAYS` | `7` |
| Encrypted secret | `RATE_LIMIT_SALT` | Random 64-character hexadecimal value |
| Variable | `CONTACT_ENABLED` | `true` only after the Worker is configured |

Generate a salt locally with:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Paste into the encrypted field; never commit it. Neither Gmail nor `FORMCARRY_FORM_ID`
belongs in Pages. Keep Node/build variables from step 1. Redeploy Pages after changing
any binding/variable. D1 Console `SELECT * FROM worker_state;` must show provider
`formcarry`, recent `last_tick` (milliseconds, under five minutes), `blocked_until=0`.
`GET /api/config` then returns `{"mode":"email","retentionDays":7}`. A heartbeat only
proves configured Worker execution, not provider access or delivery. Until ready,
the API returns 503 and the contact page shows LinkedIn instead of an unusable form.

### Delivery contract, quotas and inspection

Browser JSON remains unchanged: `name,email,kind,message,phone,projectType,timeline,
projectLink,website,startedAt`. Shared backend validation rejects unknown fields,
invalid addresses/URLs, honeypots and form ages outside 2 seconds?24 hours. Only JSON
is accepted, maximum 16 KiB; origin must match both `PUBLIC_ORIGIN` and request URL.
Source identity uses Cloudflare's connection IP hashed with the secret salt. Limits
are five attempts per source per UTC hour and 1,000 globally per UTC day. The queue
has an atomic 1,000-record ceiling. Useful statuses remain 400/403/405/413/415/429/503.

`202` means **persisted in D1 and queued**, never delivered. The Worker forwards
only validated business fields plus `inquiryId` and empty `_gotcha`; it does not
forward timing, the browser honeypot, recipients or arbitrary provider options.
JSON `email` sets Reply-To; Formcarry owns the Gmail notification configuration.
Success requires HTTP 2xx **and** numeric JSON `code:200`. Provider acceptance does
not prove inbox delivery; spam filtering, bounces or disabled notifications can
prevent mail while the submission exists in the Formcarry dashboard.

A conservative rolling **50 attempts per 31 days**, including failed/uncertain
requests, plus reserved queue capacity prevents normal usage exceeding the free
50/month. External submissions/spam against the provider endpoint can still consume
its allowance; watch the provider dashboard. At capacity, new requests return 503
and LinkedIn is shown. No paid fallback or automatic upgrade exists.

Formcarry documents that over-quota submissions can already be stored/locked.
It does not document idempotent submissions or a reliable rejection-before-storage
signal. Therefore **all unconfirmed Formcarry outcomes (quota, HTTP/JSON error,
timeout, network error) are parked as failed, never automatically resubmitted**.
New acceptance pauses for 31 days or until deliberate owner reconciliation. A
reservation recorded before the network call prevents replay after a crash or
failed success cleanup. This can park a message that never reached the provider;
manual inspection is the deliberate reliability tradeoff. D1 failures before a
reservation can recover on the ten-minute lease. Native Cloudflare email, when
selected later, retains eight attempts with exponential backoff (2 minutes?1 hour)
and at-least-once behavior; a crash after native acceptance can duplicate mail.

Check D1 Console regularly; there are no automatic failure-alert emails:

```sql
SELECT status, COUNT(*) AS count FROM inquiries GROUP BY status;
SELECT id,status,attempts,last_error,expires_at FROM inquiries ORDER BY created;
SELECT * FROM worker_state;
SELECT COUNT(*) AS attempts FROM delivery_attempts;
-- Private contents, only when needed:
SELECT payload FROM inquiries WHERE id='INQUIRY_ID';
```

For a failed Formcarry inquiry, search Formcarry submissions AND Spam by `inquiryId`,
and check Gmail/Spam and quota. If accepted, do not resend; remove its D1 inquiry
with `DELETE FROM inquiries WHERE id='INQUIRY_ID';`. If outcome cannot be established,
keep it parked or contact the visitor manually. Do not clear attempt reservations
or requeue ambiguous inquiries: that defeats duplicate protection and quota limits.
After fixing notifications/quota/configuration, and reconciling failed inquiries,
resume **new** submissions using `UPDATE worker_state SET blocked_until=0 WHERE id=1;`.
The next cron renews the heartbeat. Preserve attempt ledger entries until automatic
31-day expiry. Failed and unsent payloads expire at their original seven-day deadline
(1?30 days configurable); cleanup runs even when delivery is disabled. Worker
outages delay cleanup. Accepted payloads leave the active queue. D1 Time Travel may
retain deleted data for seven more days. Formcarry archives and Gmail copies have
separate retention: delete those manually when appropriate; restoring D1 requires
reapplying deletions. Never publish a queue-reading endpoint.

Workers Free currently provides 100,000 requests/day and 10 ms CPU; D1 Free provides
5 million rows read/day, 100,000 written/day, 5 GB account storage (500 MB/database).
The cron uses 1,440 invocations/day. Pages static requests are unlimited; Free has
500 builds/month. Other projects and abuse share these limits; monitor CPU, D1
usage and failures. Local tests cannot verify production CPU. Keep all resources
on Free; quota exhaustion can make contact unavailable, not trigger a paid service.
[Workers limits](https://developers.cloudflare.com/workers/platform/limits/),
[D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/),
[D1 limits](https://developers.cloudflare.com/d1/platform/limits/),
[Pages limits](https://developers.cloudflare.com/pages/platform/limits/).

### Owner's real end-to-end test (sends email; not performed here)

After you explicitly choose to test, visit the assigned HTTPS URL. Confirm canonical,
`og:url`, `og:image` and sitemap use that origin; assets load, theme switching works,
CV is disabled, and a nonexistent route responds 404. Submit one distinctive inquiry
using an address you control after waiting two seconds. Expect 202 and queued text;
note its inquiry ID. Within a few minutes inspect Formcarry submissions and Spam,
then Gmail inbox/Spam. Confirm all content and that Reply targets the visitor.
Confirm D1 removes the row only after provider acceptance. If no mail arrives,
inspect notification settings, quota, D1 status and Worker cron/errors; do not
keep submitting duplicates. This single test consumes one free submission.

## Path B ? connect a custom domain and email later

Only proceed after you actually own the domain. Formcarry can remain the provider
after connecting it. Custom-domain ownership does not require changing email providers.

### Connect the domain from Spaceship

Proceed only for a domain you own. This repository has not purchased one.

1. Cloudflare → **Domains/Websites → Add a domain** → `imanebenzegunine.com` →
   **Free** plan. Review/import existing DNS records, including any existing mail
   records you need to preserve. Copy the two nameservers Cloudflare assigns.
2. Spaceship → **Advanced DNS** → select `imanebenzegunine.com` → **Nameservers →
   Change → Custom nameservers**. Enter those two exact Cloudflare nameservers and
   save. DNS is managed in Cloudflare after propagation. Existing Spaceship DNS
   records become inactive; recreate required records in Cloudflare first.
   If DNSSEC was enabled at the registrar, follow Cloudflare's migration guidance
   for removing the old DS record before switching and enabling it again afterward.
3. Once Cloudflare marks the zone active, Pages project → **Custom domains → Set up
   a custom domain** → **`imanebenzegunine.com`**. Complete its wizard and allow it
   to create the apex DNS record pointing to the project's assigned Pages hostname.
   Do not invent an IP address or just add a DNS record without associating the
   domain with the Pages project.
4. Optional: add `www.imanebenzegunine.com` as another Pages custom domain, then use
   a Cloudflare Redirect Rule to redirect that hostname to the apex with status
   301 while preserving path and query. Test the rule before sharing that URL.
5. Wait for **Active** domain/TLS status. Check HTTPS and the canonical URL.

[Spaceship nameserver instructions](https://www.spaceship.com/knowledgebase/connect-domain-custom-nameservers/),
[Pages custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/),
[Cloudflare full DNS setup](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/).

### Verify native email and optional Gmail forwarding

Cloudflare → **Compute → Email Service → Email Routing → Onboard Domain** → select
`imanebenzegunine.com`. Older dashboard layouts expose this under the domain's
**Email → Email Routing**. Enable routing and apply the exact MX/SPF/DKIM records
Cloudflare supplies. Wait for the domain/DNS checks to pass. Review any existing
mail service before replacing its MX records; use the provider's exact record
values instead of guesses. Add/review DMARC for this domain as appropriate to your
existing mail configuration.

Go to **Email Routing → Destination Addresses**, add your private owner mailbox
(for example your Gmail), open Cloudflare's verification email, and click **Verify
email address**. Use that exact verified address for `MAIL_TO`. Set `MAIL_FROM` to
**`contact@imanebenzegunine.com`**, on the onboarded domain. Do not set the visitor
as the sender. There is no need to enable paid arbitrary-recipient sending.

For ordinary email to `contact@imanebenzegunine.com` to also forward to Gmail:
select the domain → **Routing Rules → Create routing rule**; email pattern
**`contact`**, domain **`imanebenzegunine.com`**, action **Send to an email**,
destination **your verified Gmail address**, then save. This forwarding rule is
separate from form submissions and does not create a mailbox or Gmail send-as
capability. Test forwarding from a different account than the destination.
[Email Routing setup and recipient verification](https://developers.cloudflare.com/email-service/get-started/route-emails/).


### Switch to native Cloudflare email (optional)

[Current Email Service pricing](https://developers.cloudflare.com/email-service/platform/pricing/)
allows free sending to verified destinations; arbitrary-recipient outbound sending
requires Paid. The sender must use an onboarded domain. This is why this path waits
for domain ownership. Use only your verified owner destination and visitor Reply-To.

First set Pages `CONTACT_ENABLED=false` and redeploy. Reconcile all Formcarry
inquiries before switching; do not resend something Formcarry already accepted.
Copy the same database ID into `cloudflare/wrangler.email.jsonc`. This config replaces
**the same named Worker**, not a second cron. Keep its `DELIVERY_ENABLED=false` initially.

```sh
npx wrangler deploy --config cloudflare/wrangler.email.jsonc
npx wrangler secret put MAIL_FROM --config cloudflare/wrangler.email.jsonc
npx wrangler secret put MAIL_TO --config cloudflare/wrangler.email.jsonc
```

Enter `contact@imanebenzegunine.com` for `MAIL_FROM` only after domain onboarding;
enter your verified private Gmail for `MAIL_TO`. These are encrypted Worker secrets,
never `VITE_` variables. `EMAIL` is the native Send Email binding. No SMTP/API token
is needed. Set `DELIVERY_ENABLED="true"` in this config, keep provider `cloudflare`,
and deploy again. Use this config for subsequent Worker deployments.

When HTTPS/custom-domain status is Active, change Pages Production `VITE_SITE_URL`
and `PUBLIC_ORIGIN` to `https://imanebenzegunine.com`; if switching provider, also set
`DELIVERY_PROVIDER=cloudflare`. Verify the matching Worker heartbeat, enable
`CONTACT_ENABLED=true`, then redeploy Pages. Repeat the owner-authorized test above.
The exact-origin check intentionally rejects submissions from the old pages.dev
hostname once the custom domain is selected. Optional forwarding to Gmail is
separate from this form and does not provide Gmail send-as.

## Local verification and Docker

```sh
npm ci
npm --prefix backend ci
npm run build
npm run typecheck
npm run lint
npm test
npm run test:pages
npm run test:pages:browser
npx wrangler deploy --config cloudflare/wrangler.worker.jsonc --dry-run --outdir .wrangler/worker-build
```

The tests use synthetic data and mocked provider calls. Pages integration uses only
an isolated local D1 database; no live email binding/provider secret is used. For
browser tests install Chromium with `npx playwright install chromium` if needed.
Docker remains `docker compose up -d --build --wait` at `http://localhost:8088`, with
local test mode and existing SMTP configuration. Docker `SITE_URL` defaults to that
local origin; Pages resolves its build URL separately. No persistent Docker volume
is assumed on Pages. No real account setup, deployment or mail send is part of these checks.
