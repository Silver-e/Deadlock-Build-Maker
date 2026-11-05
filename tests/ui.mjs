import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
await fs.mkdir("test-results", { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const nav = (name) =>
  page
    .getByRole("navigation", { name: "Planner pages" })
    .getByRole("button", { name, exact: true });
const build = () => page.locator(".page-tabs button").first().click();
const loadout = () => page.locator(".page-tabs .loadout-tab").click();
const shot = async (name) => {
  await page.evaluate(() => document.fonts.ready);
  await page
    .locator("img")
    .evaluateAll((imgs) =>
      Promise.all(imgs.map((i) => i.decode().catch(() => {}))),
    );
  await page.screenshot({
    path: `test-results/${name}.png`,
    fullPage: true,
    animations: "disabled",
  });
};
await page.goto("http://127.0.0.1:5173");
await page.getByLabel("Build name", { exact: true }).fill("Test draft");
assert.deepEqual(
  await page
    .locator(".category-top>input")
    .evaluateAll((es) => es.map((e) => e.value)),
  [
    "Early Game",
    "Optional Early",
    "Mid Game",
    "Optional Mid",
    "Late Game",
    "Optional Late",
    "Counter items",
  ],
);
assert.equal(
  await page
    .getByRole("checkbox", {
      name: "Mark Optional Early as optional",
      exact: true,
    })
    .isChecked(),
  true,
);
await page
  .getByRole("checkbox", { name: "Mark Mid Game as optional", exact: true })
  .check();
assert.equal(await page.locator(".optional-category").count(), 5);
await page.getByRole("button", { name: "Undo", exact: true }).click();
assert.equal(
  await page
    .getByRole("checkbox", { name: "Mark Mid Game as optional", exact: true })
    .isChecked(),
  false,
);
await page
  .getByRole("checkbox", { name: "Mark Mid Game as optional", exact: true })
  .check();
await page.reload();
assert.equal(
  await page
    .getByRole("checkbox", { name: "Mark Mid Game as optional", exact: true })
    .isChecked(),
  true,
);
await page.getByLabel("Category 1 name", { exact: true }).click();
await page.getByRole("button", { name: "Add items", exact: true }).click();
await page
  .getByRole("button", {
    name: "Add to Early Game: Extended Magazine",
    exact: true,
  })
  .click();
await page
  .getByRole("button", { name: "Return to build", exact: true })
  .click();
await page
  .getByRole("button", {
    name: "Equip or unequip: Extended Magazine",
    exact: true,
  })
  .click();
await page.getByRole("button", { name: "Add category", exact: true }).click();
await page.getByLabel("Category 8 name", { exact: true }).fill("Late game");
await loadout();
await page
  .getByRole("button", { name: "Unequip Extended Magazine", exact: true })
  .waitFor();
assert.match(
  await page.locator(".investment.weapon .investment-head").innerText(),
  /\+9%/,
);
assert.match(
  await page.locator('[data-stat="Weapon Damage"] summary').innerText(),
  /\+17%/,
);
await nav("Weapon").click();
await page
  .getByRole("button", { name: "Inspect Titanic Magazine", exact: true })
  .click();
await page.getByRole("button", { name: "Equip item", exact: true }).click();
await page
  .getByRole("button", { name: "Add to Late game", exact: true })
  .click();
await page.keyboard.press("Escape");
await loadout();
assert.equal(
  await page
    .getByRole("button", { name: "Unequip Extended Magazine", exact: true })
    .count(),
  0,
);
await page
  .getByRole("button", { name: "Unequip Titanic Magazine", exact: true })
  .waitFor();
assert.match(
  await page.locator(".investment.weapon .investment-head").innerText(),
  /\+12%/,
);
await page.reload();
assert.equal(
  await page.getByLabel("Build name", { exact: true }).inputValue(),
  "Test draft",
);
assert.equal(
  await page.getByLabel("Category 8 name", { exact: true }).inputValue(),
  "Late game",
);
async function equipItem(type, name) {
  await nav(type).click();
  await page
    .getByRole("button", { name: `Inspect ${name}`, exact: true })
    .click();
  await page.getByRole("button", { name: "Equip item", exact: true }).click();
  await page.keyboard.press("Escape");
}
await equipItem("Vitality", "Enchanter's Emblem");
await equipItem("Vitality", "Spirit Resilience");
await equipItem("Vitality", "Fury Trance");
await equipItem("Spirit", "Mystic Expansion");
await equipItem("Spirit", "Cold Front");
await build();
await shot("desktop");
assert.ok((await page.locator(".build-panel").boundingBox()).width > 1000);
await nav("Weapon").click();
await shot("shop");
assert.equal(await page.locator(".build-panel").isVisible(), false);
assert.equal(await page.locator(".loadout-panel").isVisible(), false);
await loadout();
assert.equal(await page.locator(".shop-panel").isVisible(), false);
const resist = page.locator('[data-stat="Spirit Resist"]');
assert.match(await resist.locator("summary").innerText(), /46.04%/);
assert.ok((await resist.locator(".conditional-chips button").count()) >= 2);
await resist.locator("summary").click();
assert.match(
  await resist.locator(".stat-breakdown").innerText(),
  /Multiplicative/,
);
const range = page.locator('[data-stat="Ability Range"]');
assert.match(await range.locator("summary").innerText(), /0%/);
assert.match(await range.locator(".conditional-chips").innerText(), /Imbued/);
await shot("stats");
await range.locator(".conditional-chips button").first().click();
await page
  .getByRole("heading", { name: "Mystic Expansion", exact: true })
  .waitFor();
await shot("details");
await page.keyboard.press("Escape");
await page.getByLabel("Unlocked extra slots").selectOption("0");
assert.equal(await page.locator(".inventory-slot.locked").count(), 3);
await page.getByLabel("Unlocked extra slots").selectOption("3");
await nav("Spirit").click();
await page.locator("#item-search").fill("zznonexistent");
await page.getByRole("heading", { name: "No matching items" }).waitFor();
await page.getByRole("button", { name: "Reset filters" }).click();
await page
  .getByLabel("Destination category")
  .selectOption({ label: "Early Game" });
await page
  .getByRole("button", { name: "Add to Early Game: Extra Spirit", exact: true })
  .click();
await page
  .getByRole("button", { name: "Return to build", exact: true })
  .click();
await page
  .getByRole("button", { name: "Equip or unequip: Extra Spirit", exact: true })
  .waitFor();
await page.setViewportSize({ width: 390, height: 844 });
for (const name of ["mobile", "mobile-shop", "mobile-stats"]) {
  if (name === "mobile") await build();
  else if (name === "mobile-shop") await nav("Spirit").click();
  else await loadout();
  await shot(name);
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    name + " overflows",
  );
}
await build();
await page.getByRole("button", { name: "New build", exact: true }).click();
assert.equal(
  await page.getByLabel("Build name", { exact: true }).inputValue(),
  "Untitled build",
);
await page.getByRole("button", { name: /My drafts/ }).click();
await page.getByRole("button", { name: /Test draft.*8 categories/ }).click();
await loadout();
await page.getByRole("button", { name: "Clear loadout", exact: true }).click();
assert.match(
  await page.locator('[data-stat="Spirit Resist"] summary').innerText(),
  /0%/,
);
assert.equal(await page.locator(".conditional-chips button").count(), 0);
assert.equal(await page.locator(".equipped-effect").count(), 0);
assert.deepEqual(errors, []);
await page.route("**/*", (r) =>
  new URL(r.request().url()).hostname === "127.0.0.1"
    ? r.continue()
    : r.abort(),
);
await page.reload();
assert.equal(
  await page.getByLabel("Build name", { exact: true }).inputValue(),
  "Test draft",
);
console.log(
  "UI passed: full-width pages, categories, upgrades, persistence, permanent and conditional stats, source inspection, slot limits, filters, mobile layouts, external requests blocked.",
);
await browser.close();
