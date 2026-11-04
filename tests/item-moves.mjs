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
  const draft = makeDraft();
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
  const client = await context.newCDPSession(page);
  const touch = (type, x = 0, y = 0) =>
    client.send("Input.dispatchTouchEvent", {
      type,
      touchPoints:
        type === "touchEnd" || type === "touchCancel" ? [] : [{ x, y }],
    });
  const position = async (locator) => {
    const rect = await locator.boundingBox();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  };
  const align = () =>
    category(0).evaluate((element) =>
      window.scrollTo(
        0,
        element.getBoundingClientRect().top + window.scrollY - 24,
      ),
    );
  const moveTouch = async (from, to) => {
    for (let step = 1; step <= 12; step++) {
      await touch(
        "touchMove",
        from.x + ((to.x - from.x) * step) / 12,
        from.y + ((to.y - from.y) * step) / 12,
      );
    }
  };

  // Chromium's real touch dispatch exercises touch-action and pointer cancellation.
  await align();
  const handle = category(0).getByRole("button", {
    name: `Move ${a.name}`,
    exact: true,
  });
  let from = await position(handle);
  let to = await position(category(1).locator(".category-top"));
  await touch("touchStart", from.x, from.y);
  await moveTouch(from, to);
  await page.locator(".category.drop-target").waitFor();
  await fs.mkdir("test-results", { recursive: true });
  await page.screenshot({ path: "test-results/mobile-item-drag.png" });
  await touch("touchEnd");
  await page.waitForFunction(
    ([id, target]) =>
      JSON.parse(localStorage.getItem("deadlock-local-drafts-v1"))
        .drafts[0].categories.find((c) => c.id === target)
        .items.includes(id),
    [a.id, draft.categories[1].id],
  );
  let state = await stored();
  assert.deepEqual(state.categories[0].items, [b.id]);
  assert.deepEqual(state.categories[1].items, [c.id, a.id]);
  assert.deepEqual(state.equipped, [a.id]);
  assert.equal(await page.locator(".detail-panel:visible").count(), 0);
  await page.reload();
  assert.deepEqual((await stored()).categories[1].items, [c.id, a.id]);

  // Keyboard/tap fallback uses the same unique move operation and supports Undo.
  await category(1)
    .getByRole("button", { name: `Move ${a.name}`, exact: true })
    .click();
  await page
    .getByLabel(`Category for ${a.name}`, { exact: true })
    .selectOption(draft.categories[0].id);
  await page.keyboard.press("Escape");
  assert.deepEqual((await stored()).categories[0].items, [b.id, a.id]);
  await undo();
  assert.deepEqual((await stored()).categories[1].items, [c.id, a.id]);
  await category(1)
    .getByRole("button", { name: `Move ${a.name}`, exact: true })
    .click();
  await page
    .getByLabel(`Category for ${a.name}`, { exact: true })
    .selectOption(draft.categories[0].id);
  await page.keyboard.press("Escape");

  // Drop onto an existing card to reorder inside a category.
  await align();
  from = await position(
    category(0).getByRole("button", { name: `Move ${a.name}`, exact: true }),
  );
  to = await position(
    category(0).getByRole("button", {
      name: `Equip or unequip: ${b.name}`,
      exact: true,
    }),
  );
  await touch("touchStart", from.x, from.y);
  await moveTouch(from, to);
  await touch("touchEnd");
  assert.deepEqual((await stored()).categories[0].items, [a.id, b.id]);
  await undo();
  assert.deepEqual((await stored()).categories[0].items, [b.id, a.id]);

  // A cancelled gesture and an out-of-bounds drop leave the draft untouched.
  for (const cancelled of [true, false]) {
    await align();
    const before = await stored();
    from = await position(
      category(0).getByRole("button", { name: `Move ${a.name}`, exact: true }),
    );
    await touch("touchStart", from.x, from.y);
    await moveTouch(from, { x: 2, y: 40 });
    await touch(cancelled ? "touchCancel" : "touchEnd");
    assert.deepEqual(await stored(), before);
    assert.equal(await page.locator(".item-drag-preview").count(), 0);
  }

  // Holding near the screen edge scrolls to a previously off-screen category.
  await align();
  from = await position(
    category(0).getByRole("button", { name: `Move ${a.name}`, exact: true }),
  );
  const scrollBefore = await page.evaluate(() => window.scrollY);
  await touch("touchStart", from.x, from.y);
  await moveTouch(from, { x: 195, y: 810 });
  await page.waitForFunction(
    (before) => window.scrollY > before + 150,
    scrollBefore,
  );
  await page.waitForFunction((id) => {
    const rect = document
      .querySelector(`[data-category-id="${id}"] .category-top`)
      .getBoundingClientRect();
    return rect.top > 64 && rect.bottom < 780;
  }, draft.categories[3].id);
  to = await position(category(3).locator(".category-top"));
  await touch("touchMove", to.x, to.y);
  await touch("touchEnd");
  assert.deepEqual((await stored()).categories[3].items, [a.id]);
  await undo();
  assert.deepEqual((await stored()).categories[0].items, [b.id, a.id]);

  // Swiping the card body still scrolls; tapping it still toggles equipment.
  await align();
  from = await position(
    category(0).getByRole("button", {
      name: `Equip or unequip: ${b.name}`,
      exact: true,
    }),
  );
  const scrollStart = await page.evaluate(() => window.scrollY);
  await touch("touchStart", from.x, from.y);
  await moveTouch(from, { x: from.x, y: from.y - 120 });
  await touch("touchEnd");
  assert.ok(
    await page.evaluate((before) => window.scrollY > before + 40, scrollStart),
  );
  assert.deepEqual((await stored()).equipped, [a.id]);
  // Reload ends native swipe momentum before testing an independent tap gesture.
  await page.reload();
  await align();
  await category(0)
    .getByRole("button", { name: `Equip or unequip: ${b.name}`, exact: true })
    .tap();
  await page.waitForFunction(
    (id) =>
      JSON.parse(
        localStorage.getItem("deadlock-local-drafts-v1"),
      ).drafts[0].equipped.includes(id),
    b.id,
  );
  assert.deepEqual((await stored()).equipped, [a.id, b.id]);
  await category(0)
    .getByRole("button", { name: `Equip or unequip: ${b.name}`, exact: true })
    .tap();
  await page.waitForFunction(
    (id) =>
      !JSON.parse(
        localStorage.getItem("deadlock-local-drafts-v1"),
      ).drafts[0].equipped.includes(id),
    b.id,
  );

  // Shop and detail actions relocate an existing item instead of duplicating it.
  await page
    .getByRole("navigation", { name: "Planner pages" })
    .getByRole("button", { name: "Weapon", exact: true })
    .click();
  await page
    .getByLabel("Destination category")
    .selectOption(draft.categories[2].id);
  await page
    .getByRole("button", {
      name: `Move from Early Game to Late Game: ${a.name}`,
      exact: true,
    })
    .click();
  state = await stored();
  assert.deepEqual(state.categories[2].items, [a.id]);
  assert.equal(
    state.categories.flatMap((c) => c.items).filter((id) => id === a.id).length,
    1,
  );
  await page.keyboard.press("Control+z");
  await page
    .getByRole("button", { name: `Inspect ${a.name}`, exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Move from Early Game to Late Game",
      exact: true,
    })
    .click();
  assert.deepEqual((await stored()).categories[2].items, [a.id]);
  await page.keyboard.press("Escape");

  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  );
  assert.deepEqual(errors, []);
  await page.screenshot({
    path: "test-results/mobile-item-moves.png",
    fullPage: true,
  });

  // Desktop's existing HTML drag path and the pointer handle both remain usable.
  const desktop = await browser.newPage({
    viewport: { width: 1440, height: 1050 },
  });
  desktop.setDefaultTimeout(5000);
  const legacy = structuredClone(draft);
  legacy.categories[3].items = [a.id];
  await desktop.addInitScript(
    (draft) =>
      localStorage.setItem(
        "deadlock-local-drafts-v1",
        JSON.stringify({ drafts: [draft], current: draft.id }),
      ),
    legacy,
  );
  await desktop.goto("http://127.0.0.1:5175");
  await desktop
    .getByText(
      "Duplicate items in saved drafts were kept in their first category.",
      { exact: true },
    )
    .waitFor();
  assert.equal(
    await desktop.evaluate(
      (id) =>
        JSON.parse(localStorage.getItem("deadlock-local-drafts-v1"))
          .drafts[0].categories.flatMap((c) => c.items)
          .filter((value) => value === id).length,
      a.id,
    ),
    1,
  );
  const desktopCategory = (index) =>
    desktop.locator(`[data-category-id="${draft.categories[index].id}"]`);
  await desktopCategory(0)
    .locator(`[data-draft-item="${a.id}"] .item-main`)
    .dragTo(desktopCategory(1).locator(".category-top"));
  await desktopCategory(1).locator(`[data-draft-item="${a.id}"]`).waitFor();
  const desktopHandle = desktopCategory(1).getByRole("button", {
    name: `Move ${a.name}`,
    exact: true,
  });
  await desktopCategory(0).evaluate((element) =>
    window.scrollTo(
      0,
      element.getBoundingClientRect().top + window.scrollY - 24,
    ),
  );
  from = await position(desktopHandle);
  to = await position(desktopCategory(0).locator(".category-top"));
  await desktop.mouse.move(from.x, from.y);
  await desktop.mouse.down();
  await desktop.mouse.move(to.x, to.y, { steps: 12 });
  await desktop.mouse.up();
  await desktopCategory(0).locator(`[data-draft-item="${a.id}"]`).waitFor();
  console.log(
    "Item moves passed: Chromium touch drag, reordering, scrolling, cancellation, persistence, Undo, unique shop/detail moves, and desktop drag.",
  );
} finally {
  await browser.close();
  await server.close();
}
