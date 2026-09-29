import test from "node:test";
import assert from "node:assert/strict";
import { resolveSiteUrl } from "../../scripts/site-url.ts";
test("build origin uses explicit URL, then Pages URL, with local-only fallback", () => {
  assert.equal(resolveSiteUrl({}), "http://localhost:8088");
  assert.equal(
    resolveSiteUrl({
      CF_PAGES: "1",
      CF_PAGES_URL: "https://hash.project.pages.dev",
    }),
    "https://hash.project.pages.dev",
  );
  assert.equal(
    resolveSiteUrl({
      CF_PAGES: "1",
      CF_PAGES_URL: "https://hash.project.pages.dev",
      VITE_SITE_URL: "https://project.pages.dev/",
    }),
    "https://project.pages.dev",
  );
  for (const url of [
    "https://example.com/path",
    "https://user:pass@example.com",
    "http://public.example.com",
    "https://example.com?q=1",
  ])
    assert.throws(() => resolveSiteUrl({ VITE_SITE_URL: url }));
  assert.throws(() => resolveSiteUrl({ CF_PAGES: "1" }));
});
