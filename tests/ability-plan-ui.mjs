import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import protobuf from "protobufjs";
import { zstdDecompressSync } from "node:zlib";
import { heroes } from "../src/heroes.js";
import { baseAbilityStats } from "../src/heroes.js";
import { abilityScaling } from "../src/abilityScaling.js";

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1050 },
  });
  const errors = [],
    external = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/*", (route) => {
    if (!route.request().url().startsWith("http://127.0.0.1:5173/")) {
      external.push(route.request().url());
      return route.abort();
    }
    return route.continue();
  });
  await page.goto("http://127.0.0.1:5173");
  await fs.mkdir("test-results", { recursive: true });
  const abilityTab = page
    .getByRole("navigation", { name: "Planner pages" })
    .getByRole("button", { name: "Abilities", exact: true });
  await abilityTab.click();
  await page
    .getByText("Choose a character above to plan ability unlocks and upgrades.")
    .waitFor();
  await page
    .getByLabel("Build character", { exact: true })
    .selectOption("hero_inferno");
  const hero = heroes.find((h) => h.id === "hero_inferno");
  const details = page.getByRole("region", {
    name: "Ability upgrades & imbues",
    exact: true,
  });
  assert.equal(await details.getByRole("article").count(), 4);
  for (const ability of baseAbilityStats({ heroId: hero.id })) {
    const article = details.getByRole("article", {
      name: ability.name,
      exact: true,
    });
    for (const prop of ability.properties) {
      const row = article.locator(`[data-ability-property="${prop.Key}"]`);
      assert.deepEqual(
        await row.locator(".ability-stat-scaling").allTextContents(),
        abilityScaling(prop),
      );
    }
  }
  for (const ability of hero.abilities) {
    const article = details.getByRole("article", {
      name: ability.name,
      exact: true,
    });
    for (const text of ability.descriptions)
      assert.ok((await article.innerText()).includes(text));
    for (const text of ability.upgradeDescriptions.filter(Boolean))
      assert.ok((await article.innerText()).includes(text));
    assert.equal(
      await article.locator(".ability-detail-upgrades li").count(),
      3,
    );
  }
  const afterburn = details.getByRole("article", {
    name: "Afterburn",
    exact: true,
  });
  const baseValues = await afterburn.locator("dl").innerText();
  await page.getByLabel("Character boon level").selectOption("35");
  assert.equal(await afterburn.locator("dl").innerText(), baseValues);
  await afterburn
    .getByLabel("Afterburn upgrade", { exact: true })
    .selectOption("3");
  assert.notEqual(await afterburn.locator("dl").innerText(), baseValues);
  assert.equal(await afterburn.locator('li[data-active="true"]').count(), 3);
  await page.screenshot({
    path: "test-results/abilities-details-desktop.png",
    fullPage: true,
  });
  const panel = page.getByRole("region", {
    name: "Ability point order",
    exact: true,
  });
  const readOrder = () =>
    page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("deadlock-local-drafts-v1")).drafts[0]
          .abilityOrder,
    );
  const choose = async (index, slot, tier) => {
    const name = hero.abilities.find((a) => a.slot === slot).name;
    await panel
      .getByRole("button", {
        name: `Step ${index + 1}: ${tier ? `Tier ${tier}` : "Unlock"} ${name}`,
        exact: true,
      })
      .click();
  };
  await choose(0, "3", 0);
  await choose(1, "3", 1);
  await choose(2, "1", 0);
  assert.deepEqual(await readOrder(), ["3", "3", "1"]);
  await page.reload();
  await abilityTab.click();
  assert.equal(await panel.locator('button[aria-pressed="true"]').count(), 3);
  await panel.getByRole("button", { name: "Undo step", exact: true }).click();
  assert.deepEqual(await readOrder(), ["3", "3"]);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  assert.deepEqual(await readOrder(), ["3", "3", "1"]);
  // Reassigning the first step makes the remaining Afterburn step an unlock.
  await choose(0, "2", 0);
  assert.deepEqual(await readOrder(), ["2", "3", "1"]);
  assert.equal(
    await panel
      .getByRole("button", { name: "Step 2: Unlock Afterburn", exact: true })
      .getAttribute("aria-pressed"),
    "true",
  );
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  const full = [
    "3",
    "3",
    "1",
    "2",
    "1",
    "4",
    "3",
    "3",
    "2",
    "2",
    "2",
    "1",
    "1",
    "4",
    "4",
    "4",
  ];
  for (let i = 3; i < full.length; i++)
    await choose(
      i,
      full[i],
      full.slice(0, i).filter((s) => s === full[i]).length,
    );
  assert.deepEqual(await readOrder(), full);
  await choose(0, "2", 0);
  const swapped = [...full];
  [swapped[0], swapped[3]] = [swapped[3], swapped[0]];
  assert.deepEqual(await readOrder(), swapped);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  assert.deepEqual(await readOrder(), full);
  await panel
    .getByText("16 / 16 steps · 32 / 32 AP", { exact: true })
    .waitFor();
  await fs.mkdir("test-results", { recursive: true });
  await panel.screenshot({ path: "test-results/ability-plan-desktop.png" });
  await page.locator(".page-tabs button").first().click();
  await page
    .getByRole("button", { name: "Copy for Deadlock", exact: true })
    .click();
  const code = await page
    .getByRole("textbox", { name: "Deadlock build code", exact: true })
    .inputValue();
  const Build = protobuf
    .parse(
      await fs.readFile(
        new URL("../data/hero-build.proto", import.meta.url),
        "utf8",
      ),
    )
    .root.lookupType("CMsgHeroBuild");
  const decoded = Build.decode(zstdDecompressSync(Buffer.from(code, "base64")));
  assert.equal(decoded.details.abilityOrder.currencyChanges.length, 16);
  assert.equal(decoded.details.abilityOrder.currencyChanges[0].currencyType, 2);
  assert.equal(decoded.details.abilityOrder.currencyChanges[1].delta, -1);
  await abilityTab.click();
  await panel.getByRole("button", { name: "Reset order", exact: true }).click();
  assert.deepEqual(await readOrder(), []);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  assert.deepEqual(await readOrder(), full);
  await page
    .getByLabel("Build character", { exact: true })
    .selectOption("hero_atlas");
  assert.deepEqual(await readOrder(), []);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  assert.deepEqual(await readOrder(), full);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  const scroll = page.getByRole("region", {
    name: "Ability point order grid",
    exact: true,
  });
  await scroll.evaluate((el) => {
    el.scrollLeft = el.scrollWidth;
  });
  assert.ok(await scroll.evaluate((el) => el.scrollLeft > 0));
  await panel.screenshot({ path: "test-results/ability-plan-mobile.png" });
  await page
    .getByLabel("Build character", { exact: true })
    .selectOption("hero_werewolf_transformed");
  await page
    .getByRole("table", { name: "Silver ability order", exact: true })
    .waitFor();
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  console.log(
    "Ability plan UI passed: editing, tier recalculation, persistence, undo/reset, hero changes, full export, offline requests, mobile scrolling.",
  );
} finally {
  await browser.close();
}
