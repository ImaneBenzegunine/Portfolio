# Imane Benzegunine — personal portfolio

**Cloudflare Pages Free deployment:** see [CLOUDFLARE_DEPLOYMENT.md](CLOUDFLARE_DEPLOYMENT.md)
for Git integration, D1, the scheduled email Worker, encrypted secrets, domain
setup and verification. This is a separate deployment path; the Docker setup
below remains available for local development and VM hosting.

React + TypeScript portfolio with 22 pre-rendered routes, a private contact API, and production Docker services. Local URL: **http://localhost:8088**. This is Imane’s personal site, with Data Engineering as its primary focus.

**Content is still awaiting owner verification.** The attachment contained the brief only, not the CV PDF. See [CONTENT_REVIEW.md](CONTENT_REVIEW.md) for the exact missing information, source differences, and publication checklist. The real PDF download and direct email cannot be completed without the PDF and email address. No domain, Azure resource, image push, or public deployment was performed.

## Architecture and choices

- **React 19, TypeScript, Vite, React Router:** typed, easy-to-edit content and reusable pages. A build-time React render generates HTML per route, including titles, descriptions, canonical URLs, Open Graph/Twitter metadata, a real PNG sharing image, ProfilePage/Person JSON-LD, sitemap, and 404 page. JavaScript hydrates interactive controls; project content remains readable without it.
- **Nginx:** a small, unprivileged static server with same-origin API proxy, security headers, local fonts, and real HTTP 404s. CSS diagrams explain supplied scope; they are not fabricated screenshots. CSP allows same-origin scripts/connections/fonts and inline styles needed for the small CSS illustration; executable inline scripts are blocked.
- **Node 24 + Express + Zod:** small backend; validates limits again, uses plain-text emails, hides credentials from the frontend, and exposes no inbox/admin HTTP routes.
- **SQLite:** a private durable outbox, stored only in the backend’s named volume. It keeps unsent inquiries across restart, then deletes them when SMTP accepts the recipient. Local mode stores synthetic test inquiries to exercise that behavior. It also persists short-lived salted rate-limit hashes. Delivered messages are not retained to justify a volume.
- **Nodemailer:** SMTP transport with required TLS, bounded timeouts, no HTML templates or file/URL attachments from submissions. The worker polls every 30 seconds, uses exponential backoff, and pauses a message after eight failed attempts until an operator retries it or retention expires. Monitor queue counts. Delivery is at-least-once: a crash after provider acceptance but before deletion may cause a duplicate; a stable Message-ID helps identify it. SMTP acceptance is not inbox delivery.

Runtime images contain application code, not `.env`, source attachments, a database, or private data. Both services run without root, with read-only root filesystems and dropped capabilities. Only the frontend publishes a port, bound to loopback. The backend alone mounts `imane-portfolio_contact_data` at `/data`. Keep **one backend instance**. SQLite is unsuitable here for horizontal replicas or shared network-file storage; use a managed database/queue when scaling, requiring high availability, or moving to Container Apps.

## Run with Docker

Prerequisites: Docker Desktop using Linux containers and Docker Compose. Node on the host is optional for editor tooling and browser tests; the site runs in Docker.

```powershell
Copy-Item .env.example .env
docker compose up -d --build --wait
docker compose ps
docker compose logs --tail=50 frontend backend
docker compose stop
docker compose start
docker compose up -d --build --wait
docker compose down
```

`down` keeps the named data volume. **Do not use `down -v` unless intentionally deleting all queued inquiries and rate limits.** The health probes check Nginx and database access. They do not prove SMTP delivery. Use `http://localhost:8088`, not `127.0.0.1:8088`, for form submissions with the default origin. If changing the host port, update `PUBLIC_ORIGIN` too.

After a backend-only replacement, Nginx re-resolves Docker DNS within ten seconds. The supplied restore script reloads it immediately. Restart/update preserves data in the volume; recreating or pulling an image changes code only. No host development server is needed.

## Editing content and CV

Edit `src/work.ts` for typed experience and project descriptions, and `src/content.ts` for profile, capabilities, notes, and metadata. Owner-supplied copy is preserved, including French text, dates, metrics, contributors, and technologies; only PDF line wrapping and broken words were repaired. Shared project pages render the available description, architecture/achievements, tools, optional diagram, and public links. Missing descriptions, dates, or individual responsibilities are not invented. Experience headings emphasize job titles, with employers secondary and linked project titles below. Layouts live in `src/App.tsx`, with base, theme, and work styles in the corresponding CSS files. Fonts are locally packaged DM Sans and DM Serif Display (Fontsource/OFL); no Google Fonts request or analytics is made.

Run `npm run format` after editing source files. Prettier is included for consistent, readable formatting.

### Appearance and homepage portrait

The header sun/moon control switches every page between light and dark themes. The initial theme follows the browser's system preference; an explicit choice is saved under `portfolio-theme` in localStorage and persists across navigation/reloads. If browser storage is blocked, the toggle still works for the current page session. `public/theme-init.js` applies the theme before the first paint without weakening the CSP. Shared theme and portrait styles live in `src/themes.css`.

The homepage uses the public profile portrait retrieved from the owner-supplied GitHub account, `https://github.com/ImaneBenzegunine.png?size=800`, stored locally at `public/images/imane-profile.jpg`. To replace it, add a preferred photo to `public/images/` and update `profile.portrait.src` in `src/content.ts`. Set the alt text and crop position alongside it, then rebuild Docker. An unavailable image falls back to a labeled monogram. No image is hotlinked and the original photo was not AI-generated or altered.

The requested Figma file `AZFeBIHjAXDeJ9bp6IL06M`, node `0:1`, could not be inspected: the web tool and browser embed were blocked. The Figma integration was offered but its connection has not been confirmed. Exact reference-layout adaptation is pending Figma access or an exported screenshot; the current layout must not be described as a verified match.

To publish a real CV, add `public/cv/Imane-Benzegunine-CV.pdf`, set `CV_AVAILABLE=true`, and rebuild. The build checks the `%PDF-` header and fails for a missing/invalid file. The CV page then offers separate view/download buttons. The file becomes a public asset: remove private details before adding it. There is no visitor file upload.

To add an article, append a typed note with `slug`, `title`, ISO `date`, `summary`, `paragraphs`, and `published: true`. Only published notes get routes and sitemap entries. Rebuild after edits. No example article is published.

`SITE_URL` defaults to the owner-confirmed **https://imanebenzegunine.com**. This is metadata configuration, not domain registration or DNS configuration. Use an origin without a trailing path. Set the final canonical URL before the public build. Changing `SITE_URL`, `PUBLIC_EMAIL`, or `CV_AVAILABLE` requires rebuilding the frontend.

## Environment and email

| Variable | Purpose |
| --- | --- |
| `SITE_URL` | Public canonical origin, compiled into the frontend |
| `PUBLIC_EMAIL` | Approved public email address; empty until confirmed |
| `CV_AVAILABLE` | Enables real CV buttons after PDF validation |
| `HOST_PORT` | Local frontend port, default 8088 |
| `PUBLIC_ORIGIN` | Exact allowed browser origin, default `http://localhost:8088` |
| `CONTACT_MODE` | `local` (default) or `smtp` |
| `RETENTION_DAYS` | Unsent/local inquiry retention, integer 1–30; default 7 |
| `RATE_LIMIT_SALT` | Random secret for address hashing; SMTP refuses the local default |
| `SMTP_HOST`, `SMTP_PORT` | Provider SMTP endpoint and port (usually 587) |
| `SMTP_SECURE` | `true` for implicit TLS (usually 465); otherwise STARTTLS is required |
| `SMTP_USER`, `SMTP_PASS` | Backend-only provider credentials |
| `MAIL_FROM`, `MAIL_TO` | Provider-verified sender and owner destination mailbox |

Generate the salt with:

```powershell
docker compose run --rm --no-deps backend node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

In **local mode**, the interface says “Send test inquiry” and the success response says “No email was sent.” Use synthetic `example.invalid` details only. Local records never become SMTP messages automatically when mode changes.

For real delivery: configure your chosen provider, verify its sender domain and SPF/DKIM/DMARC, set backend environment variables and `CONTACT_MODE=smtp`, set a random salt, configure the HTTPS origin, then recreate backend. Test actual delivery and replies in the destination mailbox. Nothing in the automated suite proves production email. The form reports a queue acknowledgement, not an “emailed” claim.

The rate limit is five attempts per connection-address hash per hour, persisted across restart. Invalid form attempts count. The form also uses a honeypot, a two-second minimum elapsed time, a 24-hour form lifetime, an exact Origin check, field limits, JSON-only requests, a 16 KiB request limit, and a 1,000-record queue cap. These are basic abuse controls, not proof against bots; elapsed time can be forged, distributed attackers can evade IP limits, and shared networks share a limit. Add an edge limiter or accessible challenge if abuse warrants it. Review trusted proxy settings when adding a CDN/load balancer; never trust arbitrary forwarded headers. Nginx currently overwrites them.

## Private queue operations and retention

No public endpoint can read messages. Operator access requires Docker/host privileges; those privileges can also access environment secrets and the volume. SQLite directory is mode 0700 and database 0600, owned by the backend user. Root access remains powerful; disk encryption and restricted host access are required for a real deployment.

```powershell
docker compose exec -T backend node admin.mjs stats
docker compose exec -T backend node admin.mjs inspect INQUIRY_ID
docker compose exec -T backend node admin.mjs delete INQUIRY_ID
docker compose exec -T backend node admin.mjs retry INQUIRY_ID
docker compose exec -T backend node admin.mjs prune
```

Use inspection only to fulfill a real operational need; it prints private content to the terminal. No visitor input is logged by the API. Retention cleanup runs at startup, every 30 seconds, and before inserts. If the container is stopped, expiry occurs when it starts again. Sent messages are deleted immediately after provider acceptance. SQLite secure deletion overwrites removed records, but snapshots/mailbox copies have separate lifecycles. Before public launch set an actual backup and mailbox expiration policy (recommended operational starting point: daily encrypted backups, seven-day rotation). Delete related backups or let them expire when fulfilling deletion requests, and reapply deletions after a restore.

## Backup, restore, and migration

**Pushing a Docker image does not transfer its local volume.** Move data separately. Do not copy a live SQLite file without a consistent snapshot. The maintenance command uses SQLite `VACUUM INTO` for a coherent snapshot and integrity-checks restores. Backups are private, gitignored, and excluded from build contexts.

PowerShell:

```powershell
.\scripts\backup.ps1 -Path backups/contact-backup.sqlite
.\scripts\restore.ps1 -Path backups/contact-backup.sqlite
```

Backup supports a running backend. Restore stops it, validates the snapshot, replaces the database, and starts it. **Restore replaces the current queue**: take a fresh backup first and schedule downtime. A failed restore leaves the backend stopped for inspection. Preserve the same Compose project name to reuse its volume. The restore script intentionally runs only the backend service for maintenance, never mounting its volume into the frontend.

Linux equivalent:

```sh
mkdir -p backups
umask 077
docker compose exec -T backend node admin.mjs backup | base64 -d > backups/contact.sqlite
docker compose stop backend
base64 -w0 backups/contact.sqlite | docker compose run --rm -T --no-deps backend node admin.mjs restore
docker compose up -d --wait backend
docker compose exec -T frontend nginx -s reload
```

For cloud migration: snapshot → encrypt → transfer over an authenticated encrypted channel → pull exact image tags on destination → start services once to initialize their volume → restore while backend is stopped → check counts, health and a synthetic inquiry → switch DNS after verified email and HTTPS. Do not carry local test inquiries into production. Keep encrypted off-host backups in a private Azure Blob container with short lifecycle expiry; test restoration periodically. Backups should be encrypted before leaving the host; storage encryption alone does not protect a locally downloaded file. No automated cloud backup resource has been created.

## Checks

```powershell
npm ci
npm run typecheck
npm run lint
npm run build
docker compose exec -T backend npm test
npx playwright install chromium
npm run test:e2e
```

The four backend tests cover input abuse, origin/content checks, rate limits, persistence/expiry, plain text, and mocked SMTP failure/retry/acceptance/deletion. Five Chromium tests check pre-rendered routes, security headers/private path blocking, desktop/mobile navigation, project filtering, CV-unavailable state, real local submission, and a deliberately mocked failure response. Test identities use `example.invalid`. Browser screenshots are saved in `test-results/`; the HTML report is `playwright-report/index.html`. Do not run synthetic submission tests against a public production endpoint. The browser suite expects local mode and the currently missing CV; update its CV assertion when the real PDF is supplied.

See [VERIFICATION.md](VERIFICATION.md) for checks actually executed and remaining limitations.

## Azure preparation — no deployment performed

**Recommendation for this implementation: one small Azure Linux VM running Docker Compose.** This preserves a simple single-writer SQLite design on a local managed disk. It requires OS patching, Docker maintenance, firewall rules, monitoring, TLS renewal, and tested off-host backups. Start with a small suitable VM and measure resource needs; no size/cost guarantee is made.

| Consideration | Small VM + Compose | Azure Container Apps |
| --- | --- | --- |
| Runtime | Current containers and Compose work with a Linux host | Managed container revisions/ingress; Compose is not the production orchestrator |
| Persistence | Named volume on a mounted managed disk | Container-local storage is ephemeral; use a managed database/queue for this outbox |
| Scaling | One backend, controlled maintenance window | Replicas and revisions make SQLite ownership unsafe; migrate storage first |
| Operations | You maintain OS, proxy, certificates and backups | Less host maintenance; configure probes, secrets, networking and service DNS |
| Costs | VM uptime, disk, public IP, backup, network | Compute/requests plus registry, database/queue, logs, storage, egress |

Container Apps supports Azure Files mounts, but mounting SQLite on a network share is not the recommended solution. SQLite warns about network filesystem locking/reliability; a managed relational store is a better migration target. The background retry worker also needs an always-running replica or a separately scheduled queue consumer—scale-to-zero alone would delay retries. [Azure storage documentation](https://learn.microsoft.com/en-us/azure/container-apps/storage-mounts), [SQLite network caveats](https://sqlite.org/useovernet.html).

For Container Apps later, migrate `backend/store.mjs` to a managed PostgreSQL/queue service, share the rate limiter appropriately, use managed database backups, configure internal backend ingress and external frontend ingress, and replace Docker’s resolver/upstream in `nginx.conf` with the environment’s service DNS. Supply secrets through Container Apps secret references/Key Vault and managed identity. Add readiness/liveness/startup probes equivalent to `/health` and `/api/health`. Use a migration/revision strategy compatible with the chosen database. This path is documented, not deployed or tested.

Container Apps consumption charges depend on CPU/memory time and requests; other services can add charges even when app traffic is low. Do not assume a free tier makes the whole site free. Check regional estimates before creation. [Microsoft billing documentation](https://learn.microsoft.com/en-us/azure/container-apps/billing).

### Images and configuration

After explicit authorization, push versioned frontend/backend images to **Azure Container Registry** (or a chosen private registry). `deploy/compose.azure.yaml` is a prepared VM override, not a deployment script. It requires `REGISTRY` and `IMAGE_TAG`; retain the base Compose project name. Build with the approved public URL/email/CV flags before tagging. Example commands for later use only:

```sh
docker tag imane-portfolio-frontend myregistry.azurecr.io/imane-portfolio-frontend:2026-09-26
docker tag imane-portfolio-backend myregistry.azurecr.io/imane-portfolio-backend:2026-09-26
# Authenticate to your approved registry before any future push.
# docker push myregistry.azurecr.io/imane-portfolio-frontend:2026-09-26
# docker push myregistry.azurecr.io/imane-portfolio-backend:2026-09-26
docker compose -f compose.yaml -f deploy/compose.azure.yaml pull
docker compose -f compose.yaml -f deploy/compose.azure.yaml up -d --no-build --wait
```

On the VM, place production `.env` outside version control with restrictive permissions, or materialize secrets from Key Vault using the VM identity. Do not pass SMTP credentials as frontend build arguments. Mount a managed data disk and configure Docker’s data-root on it before first start so the named volume is durable across VM replacement. Preserve disk permissions/UID 1000. Losing the VM or disk still requires the separate backup to recover. Image updates preserve the volume but may briefly interrupt service. Take a backup, use immutable version tags, and retain the previous image for rollback.

### Domain, HTTPS, and ongoing costs

After separate purchase authorization for **imanebenzegunine.com**, point the apex A record to the VM’s static public IP; point `www` to the chosen canonical host. Use a host-installed reverse proxy such as Caddy with the supplied `deploy/Caddyfile` template to terminate HTTPS and forward to `127.0.0.1:8088`. Set its `PORTFOLIO_DOMAIN` environment variable. Open only 80/443 publicly, restrict SSH to administrative access, and keep 8088/3001 private. Caddy’s certificate state lives on the host under its service data directory and also needs backup. No third application service or extra dummy volume is needed. Configure Nginx real-IP trust for the specific proxy address before launch; otherwise the safe default groups requests under the proxy’s address and the five-per-hour limit can affect all visitors. Update PUBLIC_ORIGIN/SITE_URL to HTTPS, confirm redirects, then enable HSTS at the TLS proxy after HTTPS works.

Container Apps has managed certificate/custom domain support with DNS verification requirements; use the currently documented A/CNAME/TXT records and certificate validation access rules. [Microsoft custom domains guide](https://learn.microsoft.com/en-us/azure/container-apps/custom-domains-managed-certificates).

Recurring charges can include the domain renewal, VM or Container Apps compute, registry storage, public IP, managed disk/database, email provider, DNS hosting, monitoring/log ingestion, backup storage/transactions, and outbound bandwidth. Obtain current regional quotes and set budgets/alerts before any paid resource is created. Azure Static Web Apps is not used as a container host.
