# Cloudflare Pages deployment (Free)

This is a separate deployment path. Docker Compose, Express, its SQLite volume,
Nginx and SMTP still work locally. No Cloudflare resource has been created, no
deployment or real email has been sent, and no domain purchase or DNS connection
is implied by the configuration in this repository.

## Architecture and email choice

```text
Browser → Pages static HTML/assets (dist)
        → /api/config, /api/contact → Pages Functions → D1 outbox
                                                       ↑
                           scheduled Worker every minute → EMAIL binding
                                                       → verified owner mailbox
```

The Functions import `backend/validation.mjs`, so both deployments use the same
Zod validation. Root dependencies include Zod so Pages builds do not need a
separate backend install. Only `/api/*` invokes Functions (`public/_routes.json`).
All 22 pages remain pre-rendered, with metadata, sitemap and local assets. The
build creates both `dist/404.html` for Pages and `dist/404/index.html` for Nginx.
There is no SPA wildcard rewrite. `_headers` secures static responses; Functions
set their own response headers because Pages `_headers` does not cover them.

Cloudflare's current documentation explicitly permits **free sending to verified
destination addresses on Workers Free, including accounts with only Email Routing
configured**. General outbound delivery to arbitrary recipients needs Workers Paid.
This portfolio sends only to `MAIL_TO`, an owner-verified destination, and sets
the visitor as `Reply-To`; it sends no visitor confirmation email.
[Email Service pricing](https://developers.cloudflare.com/email-service/platform/pricing/).

Email runs in a dedicated scheduled Worker using native `send_email`, so Pages
does not need to support an email binding or Cron Triggers. `EMAIL` without an
address restriction can send to the account's verified destinations; application
code chooses only the encrypted `MAIL_TO` secret. No API key, SMTP password or
Resend account is required. The native structured API supports plain text and
`replyTo`. Account/domain verification and actual delivery still require the
owner's end-to-end test.
[Binding restrictions](https://developers.cloudflare.com/email-service/configuration/send-bindings/),
[Workers email API](https://developers.cloudflare.com/email-service/api/send-emails/workers-api/).

## 1. Account and Git preparation

Keep **Workers Free** and the zone's **Free** plan. Do not activate Workers Paid,
general Email Sending, paid add-ons or automatic upgrades for this setup. Quotas
are shared with other projects in the account.

Commit and push these changes to the repository when ready. In Cloudflare, grant
the GitHub integration access to the private `ImaneBenzegunine/Portfolio`
repository. This work did not push or change GitHub permissions.

## 2. Create D1 and apply the migration

1. Cloudflare dashboard → **Storage & databases → D1 SQL database → Create database**
   (some accounts show this under Workers & Pages).
2. Name: **`portfolio-contact`**. Use the free allocation; leave read replication
   disabled for this small queue.
3. Copy its database ID into `database_id` in
   `cloudflare/wrangler.worker.jsonc`, replacing the all-zero placeholder.
   The database ID is an identifier, not a secret, and may be committed.
4. On your machine, in the repository root, run the following **only when you
   intend to configure your account**:

```sh
npm ci
npx wrangler login
npx wrangler d1 migrations apply portfolio-contact --remote --config cloudflare/wrangler.worker.jsonc
```

This applies `cloudflare/migrations/0001_contact.sql`. It creates `inquiries`,
`rate_limits`, `worker_state`, and their indexes. Pages and the scheduled Worker
must bind to this **same database**. A Docker database is not migrated or mounted.

## 3. Create the Pages project through Git integration

Dashboard → **Workers & Pages → Create application → Pages → Connect to Git**
(the entry may say **Import an existing Git repository**). Select GitHub and the
private repository. Choose **Pages**, not a Workers static-assets application.

| Setting | Exact value |
| --- | --- |
| Project name | `imane-portfolio` (or another available name) |
| Production branch | `main` |
| Framework preset | `None` |
| Root directory | Repository root; leave blank |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Build system | v3/current |
| `NODE_VERSION` | `24` |
| `VITE_SITE_URL` | `https://imanebenzegunine.com` |
| `VITE_CV_AVAILABLE` | `false` |
| `VITE_PUBLIC_EMAIL` | Omit / leave unset |

`.node-version` also specifies Node 24. `VITE_SITE_URL` overrides the same production
default in `src/content.ts`. Docker continues to map `SITE_URL` to that Vite
variable. Values prefixed with `VITE_` are public: never put secrets or your private
destination mailbox there. Keep the CV flag false until a real PDF exists at
`public/cv/Imane-Benzegunine-CV.pdf`; the build rejects a missing/invalid PDF when enabled.
[Pages build settings](https://developers.cloudflare.com/pages/configuration/build-configuration/),
[Node version selection](https://developers.cloudflare.com/pages/configuration/build-image/).

After the first build, configure **Pages project → Settings → Bindings** and
**Settings → Variables and Secrets** for **Production**:

| Type | Name | Value |
| --- | --- | --- |
| D1 binding | `CONTACT_DB` | Select `portfolio-contact` |
| Plain text variable | `CONTACT_ENABLED` | `false` initially; `true` after step 6 |
| Plain text variable | `PUBLIC_ORIGIN` | `https://imanebenzegunine.com` |
| Plain text variable | `RETENTION_DAYS` | `7` |
| Encrypted secret | `RATE_LIMIT_SALT` | Random secret, at least 32 characters |

Generate the salt locally with
`node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`
and paste it into the encrypted secret field. Do not commit it.

Under **Settings → Runtime**, set compatibility date **`2026-09-27`**, no
compatibility flags, and **Fail open / closed → Fail closed**. Trigger a new
production deployment after changing bindings or variables.

For **Preview**, set `CONTACT_ENABLED=false`; do **not** add production D1 or
secrets. Preview forms will be unavailable. There is deliberately no root Wrangler
configuration: Pages Git integration uses these dashboard bindings, while the
Worker has its own configuration file. The `pages:dev` script is local-only.

The first build can serve the website before the API is configured; `/api/config`
returns 503 and the form disables submission until configuration and a healthy
delivery Worker are present. `PUBLIC_ORIGIN` is intentionally exact: a production
`pages.dev` URL cannot submit on behalf of the custom domain. For temporary testing
on the production Pages URL, explicitly change `PUBLIC_ORIGIN` to that exact
`https://<actual-project>.pages.dev` origin and redeploy; restore it before launch.

## 4. Domain at Spaceship and Pages custom domain

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

## 5. Verify email domain and owner destination; optional Gmail forwarding

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

## 6. Deploy and enable the delivery Worker

`cloudflare/wrangler.worker.jsonc` configures:

| Setting | Value |
| --- | --- |
| Worker name | `portfolio-contact-delivery` |
| Entry point | `cloudflare/worker.ts` (relative `worker.ts` in config) |
| Compatibility date | `2026-09-27` |
| D1 binding | `CONTACT_DB` → same `portfolio-contact` database |
| Send Email binding | `EMAIL`, verified destinations only by default |
| Cron Trigger | `* * * * *` (every minute, UTC) |
| Public HTTP routes, workers.dev, preview URLs | None / disabled |
| `DELIVERY_ENABLED` | `false` initially |

When ready to deploy, run:

```sh
npx wrangler deploy --config cloudflare/wrangler.worker.jsonc
npx wrangler secret put MAIL_FROM --config cloudflare/wrangler.worker.jsonc
npx wrangler secret put MAIL_TO --config cloudflare/wrangler.worker.jsonc
```

Each secret command prompts for the value; do not put the mailbox into a command
argument, Git file, frontend variable or build log. Alternatively, use **Workers
& Pages → portfolio-contact-delivery → Settings → Variables and Secrets → Add →
Secret** for `MAIL_FROM` and `MAIL_TO`. No Cloudflare API token is stored in the app;
Wrangler login is only for account administration.

After verifying both secrets and the bindings in the Worker dashboard, change
`DELIVERY_ENABLED` to `"true"` in `cloudflare/wrangler.worker.jsonc` and deploy it
again. Keep this non-secret config change in Git; editing only the dashboard value
would be overwritten by a later Wrangler deployment. Under **Settings → Trigger
Events**, confirm the minute cron. Trigger propagation can take several minutes.

In D1's **Console**, check:

```sql
SELECT last_tick, datetime(last_tick / 1000, 'unixepoch') AS last_tick_utc
FROM worker_state WHERE id = 1;
```

When ticks are updating, set Pages Production `CONTACT_ENABLED=true` and redeploy
Pages. `/api/config` must now return `{"mode":"email","retentionDays":7}`.
If the heartbeat is older than five minutes, both endpoints return 503 instead
of accepting more messages into an unattended queue. A heartbeat proves the Worker
ran with syntactically valid configuration; it does not prove mailbox delivery.
Deploy future Worker changes with the same Wrangler command; Pages Git integration
deploys only the frontend and Functions, not this separate scheduled Worker.

## Reliability and free-plan limits

- A 202 response is issued only after D1 persists the inquiry. It says **queued**,
  not sent. D1 failures, missing configuration, stale Worker heartbeat and full
  queues return 503; validation returns 400 with field errors; wrong origin 403;
  wrong method 405; non-JSON 415; bodies above 16 KiB 413; rate limits 429.
- Validation retains the honeypot, 2-second minimum and 24-hour maximum form age.
  An HMAC of Cloudflare's connection address enforces five attempts per UTC hour.
  Invalid JSON/fields count. A global 1,000 attempts per UTC day budget bounds D1
  work under distributed submissions; the queue is capped atomically at 1,000.
  These controls can reject legitimate visitors during abuse, so LinkedIn remains
  the fallback. Saturated counters stop writing, though requests still use quotas.
- One inquiry is attempted each minute. Failures back off from two minutes up to
  one hour and stop after eight attempts. Failed records remain inspectable until
  their original expiry. The default expiry is seven days, configurable from 1–30
  days on Pages and stored per record. Cleanup runs every tick, including when
  sending is disabled; outages postpone cleanup until the Worker resumes.
- Atomic claims use a ten-minute lease and token. Overlapping ticks cannot claim
  the same active lease. Crashes recover after lease expiry and count toward the
  attempt limit. A crash after provider acceptance but before deletion can still
  duplicate mail. Cloudflare controls `Message-ID`, so the stable inquiry ID is in
  `X-Portfolio-Inquiry-ID` and the body instead. There is no exactly-once guarantee.
- Accepted mail is removed from the live outbox. Provider acceptance is not inbox
  delivery, and later bounces are not automatically requeued. D1 Free Time Travel
  can retain deleted records for seven more days. Mailbox retention is separate;
  reapply deletions if restoring D1. Never publish D1 inspection as a public API.
- Free quotas currently include 100,000 Worker/Functions requests per day,
  10 ms CPU per invocation, D1 5 million rows read and 100,000 rows written per day,
  and 5 GB D1 account storage with a 500 MB per-database maximum. Pages Free allows
  500 builds/month; static requests are free/unlimited. The minute schedule uses
  1,440 invocations/day, one Cron Trigger and at most 1,440 send attempts/day.
  Indexed cleanup, capped counters and a single-message batch keep normal portfolio
  use small. Other projects and abuse can still exhaust shared quotas. Monitor
  Worker CPU/errors and D1 usage in the dashboard; local tests cannot establish
  production CPU usage. Stay on Free: exhausted quotas cause unavailability,
  not an automatic paid fallback. No paid queues, persistent Docker volume or
  paid worker limits are assumed.

[Workers limits](https://developers.cloudflare.com/workers/platform/limits/),
[D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/),
[D1 storage/recovery limits](https://developers.cloudflare.com/d1/platform/limits/),
[Pages limits](https://developers.cloudflare.com/pages/platform/limits/),
[Email header restrictions](https://developers.cloudflare.com/email-service/reference/headers/).

## Inspection and retry

Use **D1 → portfolio-contact → Console**, with authenticated account access.
Check this regularly and after a failed real test; the app does not automatically
email queue-failure alerts. Check Worker metrics/errors and Email Service logs too.

```sql
SELECT status, COUNT(*) AS count, MIN(created) AS oldest FROM inquiries GROUP BY status;
SELECT id, status, attempts, next_attempt, last_error FROM inquiries ORDER BY created;
-- Only for a specific inquiry you need to inspect (contains private content):
SELECT payload FROM inquiries WHERE id = 'INQUIRY_ID';
-- After fixing the cause, explicitly retry a retained failed inquiry:
UPDATE inquiries SET status='pending', attempts=0, next_attempt=0,
  lease_until=0, lease_token=NULL, last_error=NULL
WHERE id='INQUIRY_ID' AND status='failed'
  AND expires_at > CAST(strftime('%s','now') AS INTEGER) * 1000;
-- Fulfil a deletion request in the live queue:
DELETE FROM inquiries WHERE id='INQUIRY_ID';
```

`last_error` is deliberately generic and never contains provider responses,
credentials or addresses. Do not export private records into Git or screenshots.

## Real end-to-end test (owner action; sends email)

1. After explicitly deciding to test delivery, visit the live HTTPS domain.
   Confirm `/api/config` is 200, CV offers **Request my CV**, and an invented URL
   returns HTTP 404 with the custom page.
2. Complete the form using an email address you control, wait at least two seconds,
   and submit a distinctive message. In browser Network, confirm POST returns
   **202** and **queued**, with an inquiry ID. Do not paste private data into logs.
3. Check D1 for that ID promptly (it may already be deleted if the next tick ran).
   Allow a few minutes, check the verified owner inbox and spam, and verify the
   exact inquiry content and `Reply-To`. Click Reply and confirm it targets the
   visitor address. Confirm the row disappears only after acceptance.
4. If nothing arrives, inspect Worker cron/metrics, D1 status/attempts and Email
   Service logs; verify `MAIL_TO` is a verified destination and sender DNS is active.
   Do not enable a paid plan to work around configuration mistakes. A failure test
   that changes production email settings should be performed only deliberately;
   automated local tests already cover rejection, retries, expiry and crashes.
5. Separately test the optional `contact@...` forwarding rule from another mailbox.

## Local verification

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

`npm test` runs the existing four Docker backend tests plus Cloudflare tests using
Miniflare D1 and a mocked email binding. `test:pages` starts Wrangler locally,
checks all 22 routes, metadata, assets, security headers, actual 404 responses,
disabled CV and a real HTTP-to-local-D1 submission. It uses a separate synthetic
database under `.wrangler/pages-test-state`, resets only that local database and
never binds a real email service. `test:pages:browser` also exercises
the hydrated form in Chromium; install the browser with `npx playwright install
chromium` if it is not already present. `pages:dev` starts a local Pages preview with
contact disabled until explicitly configured. Docker development remains
`docker compose up -d --build --wait` at `http://localhost:8088`; its local test
mode and SMTP configuration are unchanged.
