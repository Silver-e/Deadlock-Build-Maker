import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createServer } from "vite";
import { chromium } from "playwright";
import { makeDraft, items } from "../src/model.js";

const server = await createServer({ server: { port: 5176 } });
await server.listen();
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1050 },
  });
  page.setDefaultTimeout(8000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const d = makeDraft();
  d.heroId = "hero_werewolf";
  d.equipped = [
    "Long Range",
    "Berserker",
    "Cold Front",
    "Greater Expansion",
    "Spirit Resilience",
    "Battle Vest",
  ].map((name) => items.find((i) => i.name === name).id);
  await page.addInitScript((draft) => {
    if (!localStorage.getItem("deadlock-local-drafts-v1"))
      localStorage.setItem(
        "deadlock-local-drafts-v1",
        JSON.stringify({ drafts: [draft], current: draft.id }),
      );
  }, d);
  await page.goto("http://127.0.0.1:5176");
  const loadout = () => page.locator(".page-tabs .loadout-tab").click();
  await loadout();
  assert.equal(
    await page
      .getByRole("img", { name: "4,800 soul spike unlocked", exact: true })
      .count(),
    3,
  );
  await page.locator(".investment.weapon summary").click();
  await page
    .locator(".investment.weapon .spike-threshold")
    .getByText("Power spike")
    .waitFor();
  await fs.mkdir("test-results", { recursive: true });
  await page
    .locator(".investments")
    .screenshot({ path: "test-results/investment-spikes.png" });
  await page.locator(".investment.weapon summary").click();
  await page
    .getByRole("button", { name: "Unequip Long Range", exact: true })
    .click();
  assert.equal(
    await page
      .getByRole("img", { name: "4,800 soul spike locked", exact: true })
      .count(),
    1,
  );
  await page
    .getByRole("button", { name: "Combined stats", exact: true })
    .click();
  const controls = page.getByRole("region", {
    name: "Combat scenario",
    exact: true,
  });
  await controls.getByLabel("Lycan Curse active", { exact: true }).check();
  await controls
    .getByLabel("Lycan Curse tier", { exact: true })
    .selectOption("1");
  await controls
    .getByLabel("Spirit Resilience · conditional", { exact: true })
    .check();
  const resist = page.locator('[data-hero-stat="Spirit Resist"] > strong');
  assert.match(await resist.innerText(), /^57\.21%/); // 1 - .7 * .94 * .9 * .85 * .85.
  await page
    .getByText("Combined stat sources and stacking rules", { exact: true })
    .click();
  assert.match(
    await page.locator(".combined-breakdown").innerText(),
    /Lycan Curse/,
  );
  await page.locator(".additional-buffs > summary").click();
  await page
    .getByRole("button", { name: "Add stat source", exact: true })
    .click();
  await page
    .getByLabel("Source 1 name", { exact: true })
    .fill("Incoming shred");
  await page
    .getByLabel("Source 1 stat", { exact: true })
    .selectOption("Spirit Resist");
  await page.getByLabel("Source 1 amount", { exact: true }).fill("-10");
  assert.match(await resist.innerText(), /^47\.21%/);
  await page.reload();
  await loadout();
  assert.equal(
    await page
      .getByRole("button", { name: "Combined stats", exact: true })
      .getAttribute("aria-pressed"),
    "true",
  );
  assert.match(await resist.innerText(), /^47\.21%/);

  // A different character uses the same controls, source pipeline and formula.
  await page
    .getByLabel("Build character", { exact: true })
    .selectOption("hero_warden");
  await page
    .getByRole("button", { name: "Reset combat effects", exact: true })
    .click();
  await controls
    .locator(".hero-buff-options")
    .filter({ has: page.locator("summary", { hasText: "Last Stand" }) })
    .locator("summary")
    .click();
  await controls
    .getByLabel("Last Stand buff tier", { exact: true })
    .selectOption("3");
  await controls
    .getByLabel("Apply listed buffs from Last Stand", { exact: true })
    .check();
  assert.match(await resist.innerText(), /^88\.16%/); // 1 - .7 * .94 * .9 * .2.
  await controls
    .getByLabel("Spirit Resilience · conditional", { exact: true })
    .check();
  assert.match(await resist.innerText(), /^89\.93%/);
  await controls.getByLabel("Berserker stacks", { exact: true }).fill("5");
  await page
    .getByRole("button", { name: "Standing stats", exact: true })
    .click();
  assert.match(await resist.innerText(), /^40\.78%/);
  await page
    .getByRole("button", { name: "Combined stats", exact: true })
    .click();
  assert.match(await resist.innerText(), /^89\.93%/);
  await controls.screenshot({
    path: "test-results/combat-controls-desktop.png",
  });
  await page
    .locator(".character-stats .stat-columns")
    .screenshot({ path: "test-results/combined-stats-desktop.png" });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Overflow at ${width}`,
    );
    await page
      .getByRole("button", { name: "Combined stats", exact: true })
      .scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/combat-mobile-${width}.png` });
    const boxes = await controls
      .locator("input[type=checkbox]")
      .evaluateAll((inputs) =>
        inputs.map(
          (input) => input.closest("label").getBoundingClientRect().height,
        ),
      );
    assert.ok(boxes.every((height) => height >= 44));
  }
  assert.deepEqual(errors, []);
  console.log(
    "Combat UI passed: all three investment spikes, Silver and Warden buffs, tier changes, source totals, reductions, persistence, standing comparison and 320/390px layouts.",
  );
} finally {
  await browser.close();
  await server.close();
}
