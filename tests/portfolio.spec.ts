import { test, expect } from "@playwright/test";
test("all published routes return rendered HTML, metadata and safe headers", async ({
  request,
}) => {
  const routes = [
    "/",
    "/about",
    "/experience",
    "/projects",
    "/projects/servicenow-analytics",
    "/projects/chronobrain",
    "/projects/akkan-crowdfunding",
    "/projects/flowtrade",
    "/projects/automotive-price-analysis",
    "/projects/rag-document-intelligence",
    "/projects/quiz-master",
    "/projects/chatbot-for-university",
    "/projects/business-intelligence-dashboards",
    "/projects/image-data-ml-pipeline",
    "/recruiter",
    "/community",
    "/certifications",
    "/skills",
    "/notes",
    "/cv",
    "/contact",
    "/privacy",
  ];
  for (const path of routes) {
    const res = await request.get(path);
    expect(res.status(), path).toBe(200);
    const html = await res.text();
    expect(html).toContain("<h1>");
    expect(html).toContain("application/ld+json");
    expect(html).toContain("og:image");
    expect(res.headers()["content-security-policy"]).toContain(
      "frame-ancestors 'none'",
    );
  }
  expect((await request.get("/sitemap.xml")).status()).toBe(200);
  const social = await request.get("/social.png");
  expect(social.headers()["content-type"]).toContain("image/png");
  for (const path of [
    "/nonexistent",
    "/.env",
    "/data/contact.sqlite",
    "/backend/server.mjs",
    "/backups/contact.sqlite",
    "/api/inquiries",
  ])
    expect((await request.get(path)).status(), path).toBe(404);
});
test("desktop layout, project filters, keyboard dropdown, and honest CV state", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "From raw data",
  );
  await expect(page.locator(".project-card")).toHaveCount(3);
  await expect(page.locator(".recruiter-band")).toHaveCount(0);
  await page.screenshot({
    path: "test-results/home-desktop.png",
    fullPage: true,
  });
  const dropdown = page.getByRole("button", { name: "Contact me" });
  await dropdown.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#contact-links")).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.locator("#contact-links a").first()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dropdown).toBeFocused();
  await expect(page.locator("#contact-links")).toHaveCount(0);
  await page.getByRole("link", { name: "All projects", exact: true }).click();
  await expect(page).toHaveTitle(/Selected projects/);
  await page.getByRole("button", { name: "Applied AI" }).click();
  await expect(page.locator(".project-card")).toHaveCount(5);
  await page.locator(".project-card-link").first().click();
  await expect(page).toHaveURL(/chronobrain/);
  await expect(page.locator("#project-description")).toContainText(
    "deployed using Docker and AWS EC2.",
  );
  await page.goto("/cv");
  await expect(
    page.getByText("The approved CV PDF is not available yet."),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Request my CV" }),
  ).toHaveAttribute("href", "/contact");
  expect(errors).toEqual([]);
  await page.goto("/experience");
  await expect(
    page.getByRole("heading", {
      name: "Data Engineer AI (Internship)",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Inetum", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("link", { name: "ServiceNow Incident Analytics", exact: true })
    .click();
  await expect(page).toHaveURL(/servicenow-analytics/);
});
test("mobile navigation and project layout fit a narrow screen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/home-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("button", { name: "Contact me" }).click();
  await expect(page.locator("#contact-links")).toBeVisible();
  await page
    .locator("#contact-links")
    .getByRole("link", { name: "Send an inquiry" })
    .click();
  await expect(page).toHaveURL(/contact/);
  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toBeVisible();
  await page.getByText("Project collaboration", { exact: true }).click();
  await expect(page.getByLabel("Project link")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/contact-mobile.png",
    fullPage: true,
  });
  await page.goto("/projects/flowtrade");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/case-mobile.png",
    fullPage: true,
  });
  await page.goto("/experience");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/experience-mobile.png",
    fullPage: true,
  });
});
test("real local contact submission validates and clearly reports no email", async ({
  page,
}) => {
  await page.goto("/contact");
  const submit = page.getByRole("button", { name: "Send test inquiry" });
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(
    page.getByText("Enter your name (at least 2 characters)."),
  ).toBeVisible();
  await expect(page.getByLabel("Your name")).toBeFocused();
  await page.getByLabel("Your name").fill("Synthetic Browser Tester");
  await page.getByLabel("Email address").fill("browser@example.invalid");
  await page
    .getByLabel("Your message")
    .fill("Synthetic browser integration test. No real personal data.");
  await page.waitForTimeout(2100);
  await submit.click();
  await expect(page.getByRole("status")).toContainText("No email was sent.");
});
test("loading and failure states are accessible and preserve input", async ({
  page,
}) => {
  await page.goto("/contact");
  let releaseResponse = () => {};
  const pendingResponse = new Promise<void>((resolve) => {
    releaseResponse = resolve;
  });
  await page.route("**/api/contact", async (route) => {
    await pendingResponse;
    return route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        message: "Synthetic service unavailable. Please try again.",
      }),
    });
  });
  await page.getByLabel("Your name").fill("Synthetic Failure Tester");
  await page.getByLabel("Email address").fill("failure@example.invalid");
  await page
    .getByLabel("Your message")
    .fill("Synthetic failure-state test; preserve the message.");
  await page.getByRole("button", { name: "Send test inquiry" }).click();
  await expect(
    page.getByRole("button", { name: "Submitting…" }),
  ).toBeDisabled();
  releaseResponse();
  await expect(page.getByRole("alert")).toContainText(
    "Synthetic service unavailable",
  );
  await expect(page.getByLabel("Your message")).toHaveValue(
    "Synthetic failure-state test; preserve the message.",
  );
});
