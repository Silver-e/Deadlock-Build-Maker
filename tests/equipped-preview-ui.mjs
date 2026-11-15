import { chromium } from "playwright";
import assert from "node:assert/strict";
import { makeDraft, items } from "../src/model.js";
const item = (name) => items.find((i) => i.name === name);
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const draft = {
  ...makeDraft(),
  heroId: "hero_inferno",
  equipped: [item("Slowing Hex").id],
};
await page.addInitScript(
  (draft) =>
    localStorage.setItem(
      "deadlock-local-drafts-v1",
      JSON.stringify({ drafts: [draft], current: draft.id }),
    ),
  draft,
);
try {
  await page.goto("http://127.0.0.1:5173");
  await page
    .getByRole("navigation", { name: "Planner pages" })
    .getByRole("button", { name: "Spirit", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Add to Early Game: Superior Duration",
      exact: true,
    })
    .hover();
  const tooltip = page.getByRole("tooltip");
  await tooltip.waitFor();
  const changes = tooltip.getByRole("region", {
    name: "Equipped item changes",
    exact: true,
  });
  assert.match(await changes.innerText(), /Slowing Hex/);
  assert.match(await changes.innerText(), /3.5s\s*→\s*4.48s/);
  await page.keyboard.press("Escape");
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1050 });
    await page
      .getByRole("button", {
        name: "Inspect Transcendent Cooldown",
        exact: true,
      })
      .click();
    const detail = page.getByRole("complementary", {
      name: "Transcendent Cooldown details",
      exact: true,
    });
    const equipment = detail.getByRole("region", {
      name: "Equipped item changes",
      exact: true,
    });
    assert.match(await equipment.innerText(), /Slowing Hex/);
    assert.match(await equipment.innerText(), /29s\s*→\s*21.75s/);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    await page.keyboard.press("Escape");
  }
  assert.deepEqual(errors, []);
  console.log(
    "Equipped item previews passed: hover, details, cooldowns, duration, desktop and mobile layouts.",
  );
} finally {
  await browser.close();
}
