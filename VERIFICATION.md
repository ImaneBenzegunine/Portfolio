# Verification record — 2026-09-26

## Community order and supplied posters

Google Developer Club ENSA is now entry 01 and DevMinds Morocco entry 02. Removed the DevMinds LinkedIn source link. Copied the owner's first two supplied JFIF images unchanged into local JPEG assets for the GCP workshop and DevMinds community. The GDG description now identifies the workshop shown in the poster.

Type checking, lint, and the Docker production build passed; both containers are healthy. Read-only Chromium checks verified section order, absence of the DevMinds link, successful decoding of both images, and no horizontal overflow at 320, 390, 768, and 1440 pixels in both themes. Desktop light and mobile dark screenshots were visually inspected.

## Larger typography update

Increased compact reading/interface text by 3px throughout the base, theme, and experience styles; these sizes now use rem units. Experience copy is 18px on desktop and 17px on mobile. Navigation, controls, descriptions, metadata, and form text are larger. Large display headings retain their hierarchy. Stacked layouts now start at 760px to give the larger text sufficient space.

Type checking, lint, and the Docker production build passed; both containers became healthy. Four existing desktop/mobile/theme browser checks passed. Read-only layout checks across the home, experience, projects, FlowTrade, and contact pages found no horizontal overflow at 320, 390, 768, 1024, or 1440 pixels. Desktop experience and dark mobile screenshots were visually inspected. No contact submissions or backend changes were needed for this styling update.

## Owner-supplied work descriptions update

Removed the homepage recruiter promotional band. Published the supplied internship/project copy, retaining the source wording, French entry, dates, technology lists, and figures. Role titles now head experience entries; employers/location are secondary and project links use project names. Added five project pages for PDF document intelligence, Quiz-Master, the university chatbot, Everest BI work, and the image-data ML pipeline. The build now generates 22 routes. The supplied FlowTrade architecture replaces the earlier README-derived description/diagram.

`npm run typecheck`, `npm run lint`, and `docker compose up -d --build --wait` passed. Both containers are healthy. Browser checks now cover the added routes, removal of the homepage band, job-heading hierarchy, project-title navigation, and mobile experience overflow, alongside existing theme/navigation/contact coverage.

## Appearance update

Added light/dark themes across the site, a keyboard-accessible header toggle, system preference detection, saved browser preference, and a local homepage portrait sourced from the owner's supplied GitHub account. No image alteration was performed. The Figma web page and embed could not be read (browser returned 403); exact layout matching remains pending reference access or a screenshot. The Figma integration was offered but not confirmed connected.

Type checking, lint, and the Docker production rebuild passed. Seven Chromium tests passed before the portrait asset was connected, including system theme, stored preference after navigation/reload, mobile theme control, and blocked localStorage. After connecting the portrait, the two affected theme/portrait tests were rerun and passed: the local photo loads and decodes, mobile layout stays within the viewport, both themes work, and saved preference survives reload. Both containers were healthy after the final rebuild. Dark desktop/contact and mobile screenshots were visually inspected.

## Running application

- URL: **http://localhost:8088** (Docker Compose, not a host development server).
- Project: `imane-portfolio`; services: `frontend`, `backend`.
- Both services healthy after build/start and after the backup/restore exercise.
- Existing port 8080 belonged to another application and was preserved; this project uses 8088.
- Only frontend is exposed, on loopback `127.0.0.1:8088`. Backend port 3001 is internal.

## Commands actually executed

```text
npm install --ignore-scripts
npm audit --json
npm install nodemailer@latest --ignore-scripts          (backend directory)
npm install --save-dev sharp@latest --ignore-scripts
npm run typecheck
npm run lint
npm run build
docker compose build
docker compose up -d --build --wait
docker compose ps
docker compose exec -T backend npm test
npx playwright install chromium
npm run test:e2e
.\scripts\verify-persistence.ps1
docker compose exec -T backend ls -ld /data /data/contact.sqlite
docker compose logs --tail=12 frontend backend
```

Dependency installation initially could not reach the network inside the sandbox; the approved network-enabled installation succeeded. Docker also required access outside the sandbox. Initial dependency audits identified Nodemailer and Sharp advisories; both were updated. Subsequent npm install/audit output reported **zero known vulnerabilities** for the resolved frontend and backend dependency trees. This is an npm advisory check, not a full container security audit. ESLint 9 emits an end-of-support notice; the existing rules run successfully.

## Passed checks

- TypeScript type check, ESLint, and production build.
- Docker multi-stage builds and health checks.
- Build generated 17 HTML routes, an actual HTTP 404 page, sitemap, robots file, per-route metadata, structured profile data, and PNG sharing asset.
- **4 backend tests** passed both on the host and inside the Node 24 container: input validation/injection cases, persistence and retention, durable rate limiting, origin/content/size rejection, HTTP local acknowledgement, private route rejection, SMTP retry/deletion logic.
- **5 Chromium tests** passed, including the final rebuilt version: all published routes/metadata/headers; desktop keyboard dropdown and filtering; mobile menu and 390-pixel layout; actual local contact request with validation; disabled loading button and simulated failure preserving inputs.
- Real local API request saved synthetic test data and explicitly reported **“No email was sent.”**
- CV page and request link verified. A fabricated or broken PDF download is not shown.
- Unknown URLs and private paths (`/.env`, `/data/contact.sqlite`, `/backend/server.mjs`, `/backups/contact.sqlite`, `/api/inquiries`) returned 404.
- Desktop at 1440×1000 and mobile at 390×844 screenshots were opened and visually inspected. Home, mobile contact, and mobile case-study screenshots are in `test-results/`. No horizontal overflow was detected on the tested mobile pages.
- Frontend runtime checked for absence of `/data`, an application `.env`, and SMTP password environment. Compose only mounts the named volume into backend.
- Backend `/data` is owned by `node` with mode 0700; SQLite file mode is 0600.

## Persistence and recovery exercise

`scripts/verify-persistence.ps1` requires local mode and used only `Synthetic Persistence Tester` / `persistence@example.invalid`.

1. Submitted and read back a synthetic inquiry through the local API/operator command.
2. Restarted backend and verified the same inquiry ID and payload.
3. Rebuilt and force-recreated backend; verified the same record remained in the named volume.
4. Took a consistent SQLite snapshot using the supplied backup script.
5. Deleted that one synthetic record and checked its absence.
6. Stopped backend, restored the snapshot with integrity/schema checks, and restarted it.
7. Verified the deleted record had returned with the expected synthetic payload, then deleted that verification record.

The synthetic snapshot is `backups/synthetic-verification.sqlite`, excluded from git and image builds. It contains test data only. The browser submission also uses a synthetic `example.invalid` identity and expires under the local retention policy. No real visitor data was used. Do not migrate these test records to production.

## Mocked and unverified behavior

- SMTP acceptance and failure were **mocked in unit tests**. No real mail provider, sender domain, mailbox delivery, DNS authentication, or credentials were supplied or tested.
- Browser failure test deliberately mocked an HTTP 503 response. The successful contact submission used the real container API in local mode.
- No real CV PDF was supplied. View/download of the owner’s PDF could not be verified; the available fallback was verified instead.
- No LinkedIn export was supplied. Content uses the brief and limited public evidence documented in `CONTENT_REVIEW.md`.
- No Azure resources, registry pushes, domain purchase/DNS connection, HTTPS endpoint, or public deployment was attempted. Azure files are preparation only.
- Tested Chromium desktop/mobile viewport behavior; no physical-device, Safari, Firefox, screen-reader, or full accessibility audit was performed.
- Health probes validate HTTP service/database availability, not delivery of email or correctness of professional claims.
