import { selectCharacter, characterName } from "./character-picker-helper.mjs";
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
    ["Weapon", "Spirit", "Vitality", "Abilities"],
  );
  assert.equal(
    await page
      .getByRole("button", { name: /My drafts/ })
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
    .getByRole("button", { name: "Abilities", exact: true })
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
  await selectCharacter(page, "hero_atlas");
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
  const importedCode = await page.evaluate(() => window.copiedBuild);
  await page
    .getByRole("button", { name: "Import from Deadlock", exact: true })
    .click();
  const input = page.getByRole("textbox", {
    name: "Game build code",
    exact: true,
  });
  await input.fill("invalid");
  await page.getByRole("button", { name: "Import as new draft" }).click();
  await page.getByRole("alert").waitFor();
  assert.equal(
    await page.getByLabel("Build name", { exact: true }).inputValue(),
    "Changed build",
  );
  await input.fill(importedCode);
  await page.getByRole("button", { name: "Import as new draft" }).click();
  await page
    .getByRole("form", { name: "Import from Deadlock" })
    .waitFor({ state: "hidden" });
  assert.equal(
    await page.getByLabel("Build character", { exact: true }).inputValue(),
    characterName("hero_atlas"),
  );
  await page.reload();
  await page.getByRole("button", { name: /My drafts/ }).click();
  assert.equal(await page.locator(".draft-row").count(), 2);
  assert.equal(
    await page
      .locator(".draft-row")
      .filter({ hasText: "Changed build" })
      .count(),
    1,
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  console.log(
    "Export UI: hero validation, clipboard fallback and success, stale code reset, mobile layout passed",
  );
} finally {
  await browser.close();
}
