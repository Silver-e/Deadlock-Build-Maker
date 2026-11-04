import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { build, preview } from "vite";
import { chromium } from "playwright";

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
  await page.getByLabel("Build name", { exact: true }).fill("Pages smoke test");
  await page.getByLabel("Build character").selectOption({ index: 1 });
  await page.locator(".character-settings > summary").click();
  const nav = page.getByRole("navigation", { name: "Planner pages" });
  for (const name of [
    "Weapon",
    "Vitality",
    "Spirit",
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
