// Local-only integration check: no Cloudflare account, remote database or email binding.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const origin = "http://127.0.0.1:8789";
const state = resolve(".wrangler/pages-test-state");
const wrangler = resolve("node_modules/wrangler/bin/wrangler.js");
const env = {
  ...process.env,
  WRANGLER_SEND_METRICS: "false",
  WRANGLER_LOG_PATH: resolve(".wrangler/logs"),
  WRANGLER_REGISTRY_PATH: resolve(".wrangler/registry"),
};
function cli(args) {
  const child = spawn(process.execPath, [wrangler, ...args], {
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (data) => {
    output += data;
  });
  child.stderr.on("data", (data) => {
    output += data;
  });
  return { child, output: () => output };
}
async function command(args) {
  const { child, output } = cli(args);
  const code = await new Promise((done, fail) => {
    child.once("error", fail);
    child.once("exit", done);
  });
  assert.equal(code, 0, output());
  return output();
}

await mkdir(state, { recursive: true });
const dbConfig = resolve(".wrangler/pages-test-db.json");
await writeFile(
  dbConfig,
  JSON.stringify({
    name: "portfolio-pages-test",
    compatibility_date: "2026-09-27",
    d1_databases: [
      {
        binding: "CONTACT_DB",
        database_name: "portfolio-contact",
        database_id: "00000000-0000-0000-0000-000000000000",
      },
    ],
  }),
);
const dbArgs = [
  "d1",
  "execute",
  "portfolio-contact",
  "--config",
  dbConfig,
  "--local",
  "--persist-to",
  state,
];
// Reset only this isolated synthetic database, so repeated runs give the same result.
const migration = await readFile(
  "cloudflare/migrations/0001_contact.sql",
  "utf8",
);
const seed = resolve(".wrangler/pages-test.sql");
await writeFile(
  seed,
  `DROP TABLE IF EXISTS inquiries; DROP TABLE IF EXISTS rate_limits;
  DROP TABLE IF EXISTS worker_state; ${migration}
  INSERT INTO worker_state VALUES(1, ${Date.now()});`,
);
await command([...dbArgs, "--file", seed]);
const server = cli([
  "pages",
  "dev",
  "dist",
  "--ip",
  "127.0.0.1",
  "--port",
  "8789",
  "--inspector-port",
  "0",
  "--show-interactive-dev-session=false",
  "--compatibility-date",
  "2026-09-27",
  "--persist-to",
  state,
  "--d1",
  "CONTACT_DB=00000000-0000-0000-0000-000000000000",
  "--binding",
  "CONTACT_ENABLED=true",
  "--binding",
  `PUBLIC_ORIGIN=${origin}`,
  "--binding",
  "RATE_LIMIT_SALT=synthetic-integration-salt-32-characters",
  "--binding",
  "RETENTION_DAYS=7",
]);
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    if (server.child.exitCode !== null) throw Error(server.output());
    try {
      if ((await fetch(origin, { signal: AbortSignal.timeout(1000) })).ok) {
        ready = true;
        break;
      }
    } catch {
      /* Wait for local workerd startup. */
    }
    await delay(500);
  }
  assert.ok(ready, server.output());
  const sitemap = await (await fetch(origin + "/sitemap.xml")).text();
  const paths = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(
    (match) => new URL(match[1]).pathname,
  );
  assert.equal(paths.length, 22);
  const files = new Set();
  for (const path of paths) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 200, path);
    const html = await response.text();
    assert.ok(html.includes("<h1>"), path);
    assert.ok(
      html.includes(
        `rel="canonical" href="https://imanebenzegunine.com${path === "/" ? "/" : path}"`,
      ),
      path,
    );
    assert.ok(html.includes("application/ld+json"), path);
    assert.ok(html.includes("og:image"), path);
    assert.match(
      response.headers.get("content-security-policy"),
      /frame-ancestors 'none'/,
    );
    for (const match of html.matchAll(/(?:src|href)="(\/[^"#?]+)"/g)) {
      if (/\.(js|css|woff2?|png|jpg|svg)$/.test(match[1])) files.add(match[1]);
    }
    if (path === "/cv")
      assert.ok(!html.includes('href="/cv/Imane-Benzegunine-CV.pdf"'));
  }
  for (const path of [...files, "/social.png", "/robots.txt"])
    assert.equal((await fetch(origin + path)).status, 200, path);
  for (const path of [
    "/missing-page",
    "/projects/missing",
    "/.env",
    "/backend/server.mjs",
    "/data/contact.sqlite",
    "/cv/Imane-Benzegunine-CV.pdf",
  ]) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 404, path);
    assert.ok((await response.text()).includes("404 / A DIFFERENT PATH"), path);
  }
  const unknown = await fetch(origin + "/api/inquiries");
  assert.equal(unknown.status, 404);
  assert.deepEqual(await unknown.json(), { message: "Not found." });
  const config = await fetch(origin + "/api/config");
  assert.equal(config.status, 200, await config.clone().text());
  assert.deepEqual(await config.json(), { mode: "email", retentionDays: 7 });
  const response = await fetch(origin + "/api/contact", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
    },
    body: JSON.stringify({
      name: "Synthetic Integration",
      email: "integration@example.invalid",
      kind: "hiring",
      message: "Synthetic local Pages runtime contact test.",
      website: "",
      startedAt: Date.now() - 5000,
    }),
  });
  assert.equal(response.status, 202, await response.clone().text());
  const { id, message } = await response.json();
  assert.match(message, /queued/);
  assert.match(id, /^[a-f0-9-]{36}$/);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const stored = await command([
    ...dbArgs,
    "--command",
    `SELECT id FROM inquiries WHERE id='${id}'`,
    "--json",
  ]);
  assert.ok(stored.includes(id));
  if (process.argv.includes("--browser")) {
    const { chromium, expect } = await import("@playwright/test");
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(origin + "/contact");
      const submit = page.getByRole("button", {
        name: "Send inquiry",
        exact: true,
      });
      await expect(submit).toBeEnabled();
      await submit.click();
      await expect(
        page.getByText("Enter your name (at least 2 characters)."),
      ).toBeVisible();
      await page.getByLabel("Your name").fill("Synthetic Pages Browser");
      await page
        .getByLabel("Email address")
        .fill("pages-browser@example.invalid");
      await page
        .getByLabel("Your message")
        .fill(
          "Synthetic Pages browser contact inquiry. No real email is sent.",
        );
      await delay(2100);
      await submit.click();
      await expect(page.getByRole("status")).toContainText(
        "queued for email delivery",
      );
      assert.deepEqual(errors, []);
      console.log(
        "Chromium form integration passed against local Pages and D1.",
      );
    } finally {
      await browser.close();
    }
  }
  console.log(
    `Pages integration passed: ${paths.length} routes, metadata, assets, security headers, real 404s, API and persisted D1 submission. No email sent.`,
  );
} finally {
  server.child.kill();
  await delay(500);
}
