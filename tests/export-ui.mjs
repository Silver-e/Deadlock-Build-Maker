import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1050 },
  });
  const errors = [];
  const external = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/*", (route) => {
    if (!route.request().url().startsWith("http://127.0.0.1:5173/")) {
      external.push(route.request().url());
      return route.abort();
    }
    return route.continue();
  });
  await page.goto("http://127.0.0.1:5173");
  assert.deepEqual(
    await page
      .locator(".page-tabs button")
      .allTextContents()
      .then((names) => names.map((name) => name.trim()).slice(1, 5)),
    ["Weapon", "Spirit", "Vitality", "Ability point order"],
  );
  assert.equal(
    await page
      .locator(".header-actions .game-export + button")
      .innerText()
      .then((text) => text.trim().startsWith("My drafts")),
    true,
  );
  assert.equal(
    await page.locator(".build-panel:visible .ability-plan").count(),
    0,
  );
  await page
    .getByRole("navigation", { name: "Planner pages" })
    .getByRole("button", { name: "Ability point order", exact: true })
    .click();
  await page
    .getByRole("region", { name: "Ability planner", exact: true })
    .waitFor();
  assert.equal(
    await page
      .getByRole("region", { name: "Build editor", exact: true })
      .isVisible(),
    false,
  );
  await page.locator(".page-tabs button").first().click();
  const copy = page.getByRole("button", {
    name: "Copy for Deadlock",
    exact: true,
  });
  await copy.click();
  await page
    .getByRole("status")
    .filter({ hasText: "Select a supported build character" })
    .waitFor();
  await page
    .getByLabel("Build character", { exact: true })
    .selectOption("hero_atlas");
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw Error("blocked");
        },
      },
    }),
  );
  await copy.click();
  await page
    .getByText("Clipboard access was blocked.", { exact: false })
    .waitFor();
  const code = page.getByRole("textbox", {
    name: "Deadlock build code",
    exact: true,
  });
  assert.match(await code.inputValue(), /^KLUv/);
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text) => {
          window.copiedBuild = text;
        },
      },
    }),
  );
  await copy.click();
  await page.getByText("Build copied. In Deadlock", { exact: false }).waitFor();
  assert.equal(
    await page.evaluate(() => window.copiedBuild),
    await code.inputValue(),
  );
  await fs.mkdir("test-results", { recursive: true });
  await page.screenshot({
    path: "test-results/export-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: "test-results/export-mobile.png",
    fullPage: true,
  });
  await page.getByLabel("Build name", { exact: true }).fill("Changed build");
  assert.equal(await code.count(), 0);
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  console.log(
    "Export UI: hero validation, clipboard fallback and success, stale code reset, mobile layout passed",
  );
} finally {
  await browser.close();
}
