import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { render, pageInfo, profile } from "../.render/prerender.js";
import sharp from "sharp";
await sharp("public/social.svg").png().toFile("dist/social.png");
const escape = (s) =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
const base = new URL(profile.siteUrl);
if (
  !["http:", "https:"].includes(base.protocol) ||
  base.pathname !== "/" ||
  base.search ||
  base.hash
)
  throw Error(
    "SITE_URL must be an http(s) origin without a path, query, or fragment.",
  );
if (profile.cvAvailable) {
  const pdf = await readFile("public" + profile.cvPath);
  if (pdf.subarray(0, 5).toString() !== "%PDF-")
    throw Error("CV_AVAILABLE requires a real PDF.");
}
const template = await readFile("dist/index.html", "utf8");
const allPages = {
  ...pageInfo,
  "/404": {
    title: "Page not found",
    description: "This page could not be found.",
  },
};
for (const [path, info] of Object.entries(allPages)) {
  const title = path === "/" ? info.title : `${info.title} | ${profile.name}`;
  const canonical = base.origin + (path === "/404" ? "/" : path);
  const schema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url: canonical,
    mainEntity: {
      "@type": "Person",
      name: profile.name,
      jobTitle: profile.role,
      url: base.origin,
      sameAs: [profile.linkedin, profile.github],
      alumniOf: { "@type": "EducationalOrganization", name: "ENSA Berrechid" },
    },
  }).replaceAll("<", "\\u003c");
  const head = `<title>${escape(title)}</title><meta name="description" content="${escape(info.description)}"/><link rel="canonical" href="${escape(canonical)}"/><meta name="robots" content="${path === "/404" ? "noindex" : "index,follow"}"/><meta property="og:type" content="website"/><meta property="og:title" content="${escape(title)}"/><meta property="og:description" content="${escape(info.description)}"/><meta property="og:url" content="${escape(canonical)}"/><meta property="og:image" content="${base.origin}/social.png"/><meta property="og:image:width" content="1200"/><meta property="og:image:height" content="630"/><meta property="og:image:alt" content="Imane Benzegunine — Data Engineer"/><meta name="twitter:card" content="summary_large_image"/><script type="application/ld+json">${schema}</script>`;
  const folder = path === "/" ? "dist" : `dist${path}`;
  await mkdir(folder, { recursive: true });
  await writeFile(
    folder + "/index.html",
    template.replace("<!--head-->", head).replace("<!--app-->", render(path)),
  );
}
// Pages requires a root 404.html to disable its implicit SPA fallback.
// Keep /404/index.html too: Nginx uses it in the Docker deployment.
await copyFile("dist/404/index.html", "dist/404.html");
await writeFile(
  "dist/sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${Object.keys(
    pageInfo,
  )
    .map((p) => `<url><loc>${escape(base.origin + p)}</loc></url>`)
    .join("")}</urlset>`,
);
await writeFile(
  "dist/robots.txt",
  `User-agent: *\nAllow: /\nSitemap: ${base.origin}/sitemap.xml\n`,
);
console.log(
  `Prerendered ${Object.keys(pageInfo).length} routes and a 404 page.`,
);
