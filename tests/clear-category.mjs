import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createServer } from "vite";
import { chromium } from "playwright";
import { makeDraft, items } from "../src/model.js";

const server = await createServer({ server: { port: 5175 } });
await server.listen();
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const draft = makeDraft({ starterItems: false });
  const [a, b, c] = items.filter((item) => item.type === "Weapon").slice(0, 3);
  draft.categories[0].items = [a.id, b.id];
  draft.categories[1].items = [c.id];
  draft.equipped = [a.id];
  await page.addInitScript((draft) => {
    if (!localStorage.getItem("deadlock-local-drafts-v1"))
      localStorage.setItem(
        "deadlock-local-drafts-v1",
        JSON.stringify({ drafts: [draft], current: draft.id }),
      );
  }, draft);
  await page.goto("http://127.0.0.1:5175");
  const stored = () =>
    page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("deadlock-local-drafts-v1")).drafts[0],
    );
  const category = (index) =>
    page.locator(`[data-category-id="${draft.categories[index].id}"]`);
  const undo = () =>
    page.getByRole("button", { name: "Undo", exact: true }).click();
  const clear = category(0).getByRole("button", {
    name: "Clear all items from Early Game",
    exact: true,
  });
  await clear.click();
  await page.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("deadlock-local-drafts-v1")).drafts[0]
        .categories[0].items.length === 0,
  );
  let cleared = await stored();
  assert.deepEqual(cleared.categories[0], {
    ...draft.categories[0],
    items: [],
  });
  assert.deepEqual(cleared.categories[1], draft.categories[1]);
  assert.deepEqual(cleared.equipped, draft.equipped);
  assert.equal(await clear.isDisabled(), true);
  await undo();
  await page.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("deadlock-local-drafts-v1")).drafts[0]
        .categories[0].items.length === 2,
  );
  assert.deepEqual((await stored()).categories[0].items, [a.id, b.id]);
  assert.deepEqual(errors, []);
  console.log(
    "Clear category: empty state, category metadata, other categories, loadout and Undo passed",
  );
} finally {
  await browser.close();
  await server.close();
}
