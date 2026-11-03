import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
await fs.mkdir("test-results", { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
const errors = [],
  external = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.route("**/*", async (route) => {
  if (!route.request().url().startsWith("http://127.0.0.1:5173")) {
    external.push(route.request().url());
    return route.abort();
  }
  return route.continue();
});
await page.goto("http://127.0.0.1:5173");
await page.getByLabel("Build name", { exact: true }).fill("Afterburn draft");
await page
  .getByLabel("Build character", { exact: true })
  .selectOption("hero_inferno");
await page
  .getByLabel("Item preview imbue target", { exact: true })
  .selectOption("3");
await page
  .getByRole("navigation", { name: "Planner pages" })
  .getByRole("button", { name: "Spirit", exact: true })
  .click();
const duration = page.getByRole("button", {
  name: "Add to Early Game: Duration Extender",
  exact: true,
});
await duration.hover();
const tooltip = page.getByRole("tooltip");
await tooltip.waitFor();
const preview = tooltip.getByRole("region", {
  name: "Infernus ability changes",
});
assert.match(await preview.innerText(), /3s\s*→\s*3.66s/);
assert.match(await preview.innerText(), /IMBUE\s*Afterburn/);
await tooltip.locator(".tooltip-surface").evaluate((el) => {
  el.scrollTop = el.scrollHeight;
});
await page.screenshot({ path: "test-results/character-hover.png" });
const bounds = await tooltip.boundingBox();
assert.ok(
  bounds.x >= 0 &&
    bounds.x + bounds.width <= 1440 &&
    bounds.y >= 0 &&
    bounds.y + bounds.height <= 1050,
);
await page.keyboard.press("Escape");
await duration.click({ modifiers: ["Shift"] });
await page.locator(".character-settings > summary").click();
assert.equal(
  await page.getByLabel("Duration Extender imbue target").inputValue(),
  "3",
);
await page.getByLabel('Item preview imbue target').selectOption('1');
assert.equal(await page.getByLabel('Duration Extender imbue target').inputValue(), '3', 'Changing a hypothetical target must not retarget equipped imbues');
await page.getByLabel('Item preview imbue target').selectOption('3');
await page.getByLabel("Afterburn upgrade").selectOption("3");
await page.getByLabel("Character boon level").selectOption("10");
await page.locator(".page-tabs .loadout-tab").click();
await page
  .getByRole("region", { name: "Character stats", exact: true })
  .waitFor();
await page
  .locator(".character-ability")
  .filter({ hasText: "Afterburn" })
  .locator("summary")
  .click();
assert.match(
  await page.locator(".character-ability[open]").innerText(),
  /7.32s/,
);
assert.match(
  await page.locator('[data-hero-stat="Max Health"]').innerText(),
  /1,220/,
);
await page.evaluate(() => document.fonts.ready);
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({
  path: "test-results/character-stats.png",
  fullPage: true,
});
await page.getByRole("button", { name: /My drafts/ }).click();
assert.equal(
  await page.getByRole("img", { name: "Infernus", exact: true }).count(),
  1,
);
await page.getByRole("button", { name: "Close drafts" }).click();
await page.reload();
assert.equal(
  await page.getByLabel("Build character").inputValue(),
  "hero_inferno",
);
assert.equal(await page.getByLabel("Character boon level").inputValue(), "10");
await page.locator(".character-settings > summary").click();
assert.equal(await page.getByLabel("Afterburn upgrade").inputValue(), "3");
assert.equal(
  await page.getByLabel("Duration Extender imbue target").inputValue(),
  "3",
);
await page.getByRole("button", { name: "New build", exact: true }).click();
assert.equal(await page.getByLabel("Build character").inputValue(), "");
await page.getByLabel("Build character").selectOption("hero_chrono");
await page.getByRole("button", { name: /My drafts/ }).click();
assert.equal(
  await page.getByRole("img", { name: "Paradox", exact: true }).count(),
  1,
);
assert.equal(
  await page.getByRole("img", { name: "Infernus", exact: true }).count(),
  1,
);
await page.screenshot({ path: "test-results/character-drafts.png" });
await page
  .locator(".draft-row > button:first-child")
  .filter({ hasText: "Afterburn draft" })
  .click();
assert.equal(
  await page.getByLabel("Build character").inputValue(),
  "hero_inferno",
);
await page.setViewportSize({ width: 390, height: 844 });
await page.locator(".character-settings > summary").click();
await page.screenshot({
  path: "test-results/character-mobile.png",
  fullPage: true,
});
assert.equal(
  await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  true,
);
await page
  .getByRole("navigation", { name: "Planner pages" })
  .getByRole("button", { name: "Spirit", exact: true })
  .click();
await page
  .getByRole("button", { name: "Inspect Duration Extender", exact: true })
  .click();
await page
  .getByRole("complementary", { name: "Duration Extender details" })
  .waitFor();
assert.match(
  await page.locator(".item-detail .ability-preview").innerText(),
  /Afterburn/,
);
await page.keyboard.press("Escape");
assert.deepEqual(errors, []);
assert.deepEqual(external, []);
await browser.close();
console.log(
  "Characters passed: selection, boon/rank controls, assigned duration comparison, character totals, local persistence, independent draft portraits, mobile layout and detail preview, no external requests.",
);
