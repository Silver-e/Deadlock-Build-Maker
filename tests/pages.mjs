import { selectCharacter, characterName } from "./character-picker-helper.mjs";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { build, preview } from "vite";
import { chromium } from "playwright";
import { items } from "../src/model.js";
import { itemMatchesStat } from "../src/itemSearch.js";

// Deliberately use a different folder to catch hardcoded repository names.
const base = "/pages-smoke-test/";
await build({ base });
const server = await preview({ base, preview: { port: 4174 } });
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("requestfailed", (request) => errors.push(request.url()));
  page.on("response", (response) => {
    if (response.status() >= 400)
      errors.push(`${response.status()} ${response.url()}`);
  });
  const origin = "http://127.0.0.1:4174";
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin || !url.pathname.startsWith(base)) {
      errors.push(`Request outside deployment folder: ${url}`);
      return route.abort();
    }
    return route.continue();
  });
  await page.goto(origin + base);
  const character = page.getByRole("combobox", {
    name: "Build character",
    exact: true,
  });
  await character.fill("infer");
  const infernus = page.getByRole("option", { name: "Infernus", exact: true });
  assert.equal(await infernus.locator("img").count(), 1);
  assert.ok(
    await infernus
      .locator("img")
      .evaluate((img, prefix) => img.src.includes(prefix), base),
  );
  await character.press("ArrowDown");
  await character.press("ArrowDown");
  await character.press("Enter");
  assert.equal(await character.inputValue(), "Infernus");
  await character.fill("no such character");
  await page.getByText("No characters match. Try another name.").waitFor();
  await character.press("Escape");
  assert.equal(await character.inputValue(), "Infernus");
  await character.click();
  await page
    .getByRole("option", { name: "Choose a character", exact: true })
    .click();
  assert.equal(await character.inputValue(), "");
  await page.getByLabel("Build name", { exact: true }).fill("Pages smoke test");
  await selectCharacter(page, "hero_atlas");
  await page
    .getByRole("navigation", { name: "Planner pages" })
    .getByRole("button", { name: "Abilities", exact: true })
    .click();
  const nav = page.getByRole("navigation", { name: "Planner pages" });
  for (const name of [
    "Weapon",
    "Vitality",
    "Spirit",
    "Abilities",
    "Loadout & stats",
    "Build",
  ]) {
    await nav.getByRole("button", { name: new RegExp(`^${name}`) }).click();
    await page
      .locator("img")
      .evaluateAll((images) =>
        Promise.all(images.map((image) => image.decode())),
      );
  }
  for (const type of ["Weapon", "Spirit", "Vitality"]) {
    await nav.getByRole("button", { name: type, exact: true }).click();
    const search = page.getByRole("combobox", {
      name: "Search stats",
      exact: true,
    });
    await search.fill("Weapon Damage");
    const expected = items.filter(
      (item) => item.type === type && itemMatchesStat(item, "Weapon Damage"),
    );
    assert.equal(
      await page.locator('.shop-grid button[aria-label^="Inspect "]').count(),
      expected.length,
    );
    for (const item of expected) {
      assert.equal(
        await page
          .getByRole("button", { name: "Inspect " + item.name, exact: true })
          .count(),
        1,
      );
    }
    await search.fill("no such stat exists");
    await page.getByRole("heading", { name: "No matching items" }).waitFor();
    await page
      .getByRole("button", { name: "Reset filters", exact: true })
      .click();
    assert.equal(await search.inputValue(), "");
    await search.fill("health");
    await page
      .getByRole("button", { name: "Clear stat search", exact: true })
      .click();
    assert.equal(await search.inputValue(), "");
  }
  // Exercise the custom picker with a keyboard and a real touch context.
  await nav.getByRole("button", { name: "Weapon", exact: true }).click();
  const picker = page.getByRole("combobox", { name: "Search stats" });
  await picker.fill("fire");
  await picker.press("ArrowDown");
  await picker.press("Enter");
  assert.equal(await picker.inputValue(), "Fire Rate");
  assert.equal(await page.getByRole("listbox").count(), 0);
  await picker.click();
  await picker.press("Escape");
  assert.equal(await picker.getAttribute("aria-expanded"), "false");
  const touch = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const mobile = await touch.newPage();
  await mobile.goto(origin + base);
  await mobile
    .getByRole("navigation", { name: "Planner pages" })
    .getByRole("button", { name: "Weapon", exact: true })
    .tap();
  await mobile.getByRole("button", { name: "Browse stats", exact: true }).tap();
  const mobilePicker = mobile.getByRole("combobox", { name: "Search stats" });
  await mobilePicker.fill("fire");
  const option = mobile.getByRole("option", { name: "Fire Rate", exact: true });
  assert.equal(await option.locator("img").count(), 1);
  const box = await mobile.getByRole("listbox").boundingBox();
  assert.ok(box.x >= 0 && box.x + box.width <= 390);
  assert.ok((await option.boundingBox()).height >= 44);
  await option.tap();
  assert.equal(await mobilePicker.inputValue(), "Fire Rate");
  assert.equal(await mobile.getByRole("listbox").count(), 0);
  await mobile.getByRole("button", { name: "Browse stats", exact: true }).tap();
  await mobile
    .getByRole("button", { name: "Close stat suggestions", exact: true })
    .tap();
  assert.equal(await mobilePicker.getAttribute("aria-expanded"), "false");
  await mobilePicker.fill("unlisted stat");
  await mobile.getByText("No preset stats match.", { exact: false }).waitFor();
  await mobile.screenshot({
    path: "test-results/stat-picker-mobile-empty.png",
  });
  await mobile
    .getByRole("button", { name: "Clear stat search", exact: true })
    .tap();
  await mobile.screenshot({ path: "test-results/stat-picker-mobile.png" });
  await page
    .getByRole("button", { name: "Clear stat search", exact: true })
    .click();
  await page.screenshot({ path: "test-results/stat-picker-desktop.png" });
  await touch.close();
  await nav.getByRole("button", { name: /^Build/ }).click();
  await page.evaluate(() => document.fonts.ready);
  await page.reload();
  assert.equal(
    await page.getByLabel("Build name", { exact: true }).inputValue(),
    "Pages smoke test",
  );

  // Include assets from characters and items not rendered during the smoke flow.
  const paths = new Set();
  const collect = (value) => {
    if (
      typeof value === "string" &&
      /^\/(?!\/).+\.(png|webp|svg|jpe?g)$/.test(value)
    )
      paths.add(value);
    else if (value && typeof value === "object")
      Object.values(value).forEach(collect);
  };
  for (const file of ["items", "heroes", "stat-icons"]) {
    collect(JSON.parse(await readFile(`data/${file}.json`, "utf8")));
  }
  for (const path of paths) {
    const response = await fetch(origin + base + path.slice(1));
    assert.equal(response.status, 200, path);
    assert.ok(response.headers.get("content-type")?.startsWith("image/"), path);
    await response.arrayBuffer();
  }
  assert.deepEqual(errors, []);
  console.log(
    `Pages smoke test passed; ${paths.size} snapshot assets verified.`,
  );
} finally {
  await browser?.close();
  await new Promise((resolve, reject) =>
    server.httpServer.close((error) => (error ? reject(error) : resolve())),
  );
}
