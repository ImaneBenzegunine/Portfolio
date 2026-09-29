// Shared by both Vite builds (browser and prerender), without exposing CF env vars.
export function resolveSiteUrl(
  env: Record<string, string | undefined>,
): string {
  const supplied = env.VITE_SITE_URL?.trim() || env.CF_PAGES_URL?.trim();
  if (env.CF_PAGES === "1" && !supplied)
    throw Error(
      "Set VITE_SITE_URL to the assigned https://<project>.pages.dev URL.",
    );
  const url = new URL(supplied || "http://localhost:8088");
  if (
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    (url.protocol !== "https:" &&
      !(
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(url.hostname)
      ))
  )
    throw Error(
      "VITE_SITE_URL must be an HTTPS origin without a path (HTTP is allowed locally).",
    );
  if (env.CF_PAGES === "1" && url.protocol !== "https:")
    throw Error("Cloudflare Pages needs a public HTTPS VITE_SITE_URL.");
  return url.origin;
}
