import assert from "node:assert/strict";
import { build, preview } from "vite";
import { chromium } from "playwright";
import { selectCharacter } from "./character-picker-helper.mjs";

await build({ base: "/recommendations-test/" });
const server = await preview({
  base: "/recommendations-test/",
  preview: { port: 4176 },
});
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("http://localhost:4176/recommendations-test/");
  const rec = page.getByRole("region", { name: "Build recommendations" });
  await rec
    .getByRole("button", { name: "Recommend items & abilities" })
    .click();
  await rec
    .getByText("Select a character to see researched build recommendations.")
    .waitFor();
  await selectCharacter(page, "hero_warden");
  await rec
    .getByRole("button", { name: "Recommend items & abilities" })
    .click();
  await rec.getByLabel("Build style").selectOption("spirit-guide");
  assert.equal(
    await rec
      .getByRole("link", { name: "Hydration · Spirit Warden" })
      .getAttribute("href"),
    "https://mobalytics.gg/deadlock/builds/spirit-warden-hydration",
  );
  const stored = () =>
    page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("deadlock-local-drafts-v1")).drafts[0],
    );
  const before = await stored();
  await rec
    .getByRole("button", { name: "Add missing suggested items" })
    .click();
  await page.waitForFunction(() =>
    JSON.parse(
      localStorage.getItem("deadlock-local-drafts-v1"),
    ).drafts[0].categories.some((c) => c.name.startsWith("Recommended")),
  );
  const after = await stored();
  assert.deepEqual(
    after.categories.slice(0, before.categories.length),
    before.categories,
  );
  assert.deepEqual(after.equipped, before.equipped);
  assert.equal(
    await rec
      .getByRole("button", { name: "Add missing suggested items" })
      .isDisabled(),
    true,
  );
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await page.waitForFunction(
    () =>
      !JSON.parse(
        localStorage.getItem("deadlock-local-drafts-v1"),
      ).drafts[0].categories.some((c) => c.name.startsWith("Recommended")),
  );
  await rec.getByRole("button", { name: "Use this ability order" }).click();
  await page.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("deadlock-local-drafts-v1")).drafts[0]
        .abilityOrder.length === 16,
  );
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await page.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("deadlock-local-drafts-v1")).drafts[0]
        .abilityOrder.length === 0,
  );
  await selectCharacter(page, "hero_tengu");
  assert.equal(await rec.getByRole("combobox").count(), 0);
  await rec
    .getByRole("button", { name: "Recommend items & abilities" })
    .click();
  await rec.getByLabel("Build style").selectOption("spirit-guide");
  await rec
    .getByText("No verified ability sequence", { exact: false })
    .waitFor();
  await rec.getByLabel("Build style").selectOption("weapon-guide");
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await rec
    .getByRole("button", { name: "Recommend Monster Rounds", exact: true })
    .click();
  await rec
    .getByRole("status")
    .filter({ hasText: "Monster Rounds added" })
    .waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "Recommendations UI: character selection, distinct styles, sources, add missing, Undo, ability order, hero reset and mobile passed",
  );
} finally {
  await browser.close();
  await server.close();
}
