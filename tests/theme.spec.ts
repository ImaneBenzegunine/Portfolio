import { test, expect } from "@playwright/test";

test("theme follows system preference and explicit choice survives navigation and reload", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(
    page.getByRole("button", { name: "Switch to light mode" }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/home-dark.png", fullPage: true });
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("link", { name: "Work", exact: true }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(
    await page.evaluate(() => localStorage.getItem("portfolio-theme")),
  ).toBe("light");
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await page.goto("/contact");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByLabel("Your name")).toHaveCSS(
    "background-color",
    "rgb(28, 37, 48)",
  );
  await page.screenshot({
    path: "test-results/contact-dark.png",
    fullPage: true,
  });
});

test("theme toggle remains reachable with mobile menu closed and storage unavailable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("Storage disabled for this test");
      },
    });
  });
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Switch to dark mode" });
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByRole("img", { name: "Portrait of Imane Benzegunine" }),
  ).toBeVisible();
  expect(
    await page
      .locator(".portrait-frame img")
      .evaluate(
        (image: HTMLImageElement) => image.complete && image.naturalWidth > 0,
      ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/home-dark-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("button", { name: "Contact me" }).click();
  await expect(page.locator("#contact-links")).toBeVisible();
});
