import { test } from "node:test";
import assert from "node:assert/strict";
import {
  items,
  byId,
  types,
  thresholds,
  bonuses,
  investment,
  equip,
  ancestors,
  makeDraft,
  validDraft,
  moveDraftItem,
  uniqueDraftItems,
} from "../src/model.js";
test("moving draft items enforces one category without changing equipment", () => {
  const d = makeDraft();
  const [a, b, c] = items.slice(0, 3).map((item) => item.id);
  d.categories[0].items = [a, b];
  d.categories[1].items = [c];
  d.equipped = [a];
  const before = structuredClone(d);
  const moved = moveDraftItem(d, a, d.categories[1].id, 0);
  assert.deepEqual(
    moved.categories.map((c) => c.items),
    [[b], [a, c], [], [], [], [], []],
  );
  assert.deepEqual(moved.equipped, [a]);
  assert.deepEqual(d, before);
  const repeat = moveDraftItem(moved, a, d.categories[1].id);
  assert.deepEqual(repeat.categories[1].items, [c, a]);
  assert.equal(
    repeat.categories.flatMap((c) => c.items).filter((id) => id === a).length,
    1,
  );
  assert.equal(moveDraftItem(d, "unknown", d.categories[0].id), d);
  assert.equal(moveDraftItem(d, a, "unknown"), d);
});
test("reordering uses the original drop index and dropping on itself does nothing", () => {
  const d = makeDraft();
  const ids = items.slice(0, 4).map((item) => item.id);
  d.categories[0].items = ids;
  const target = d.categories[0].id;
  assert.deepEqual(moveDraftItem(d, ids[0], target, 2).categories[0].items, [
    ids[1],
    ids[0],
    ids[2],
    ids[3],
  ]);
  assert.deepEqual(moveDraftItem(d, ids[3], target, 1).categories[0].items, [
    ids[0],
    ids[3],
    ids[1],
    ids[2],
  ]);
  assert.deepEqual(moveDraftItem(d, ids[1], target, 1), d);
});
test("legacy duplicate cleanup keeps the first occurrence and all draft settings", () => {
  const d = makeDraft();
  const [a, b] = items.slice(0, 2).map((item) => item.id);
  d.categories[0].items = [a, a];
  d.categories[1].items = [a, b];
  d.categories[3].items = [b];
  d.equipped = [a, b];
  const before = structuredClone(d);
  const clean = uniqueDraftItems(d);
  assert.deepEqual(
    clean.categories.map((c) => c.items),
    [[a], [b], [], [], [], [], []],
  );
  assert.deepEqual(clean.equipped, d.equipped);
  assert.deepEqual(
    clean.categories.map((c) => c.optional),
    [false, true, false, true, false, true, true],
  );
  assert.deepEqual(d, before);
  assert.deepEqual(uniqueDraftItems(clean), clean);
  assert.ok(validDraft(clean));
});
test("new drafts use seven ordered categories with optional choices flagged", () => {
  const d = makeDraft();
  assert.deepEqual(
    d.categories.map((c) => c.name),
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
  assert.deepEqual(
    d.categories.map((c) => c.optional),
    [false, true, false, true, false, true, true],
  );
  assert.ok(validDraft(d));
  assert.deepEqual(
    JSON.parse(JSON.stringify(d)).categories.map((c) => c.optional),
    [false, true, false, true, false, true, true],
  );
  assert.equal(new Set(d.categories.map((c) => c.id)).size, 7);
});
test("legacy drafts without optional flags remain valid and are not renamed", () => {
  const d = makeDraft();
  d.categories = d.categories.slice(0, 3).map((c, i) => {
    const { optional, ...legacy } = c;
    return { ...legacy, name: ["Early game", "Core items", "Situational"][i] };
  });
  const before = structuredClone(d);
  assert.ok(validDraft(d));
  assert.deepEqual(d, before);
  d.categories[0].optional = "yes";
  assert.equal(validDraft(d), false);
});
test("catalog covers every standard item with complete local data", () => {
  assert.equal(items.length, 156);
  for (const i of items) {
    assert.ok(types.includes(i.type));
    assert.ok(i.stats.length || i.description);
    assert.ok(!/mw-parser-output|\{g:|\{s:/.test(JSON.stringify(i)));
    for (const id of i.components)
      assert.ok(byId[id], `${i.name}: missing component ${id}`);
  }
});
test("all investment thresholds and just-below boundaries match the wiki table", () => {
  for (const type of types) {
    const original = byId.__test;
    try {
      byId.__test = { cost: 0, type };
      assert.equal(investment([], type).bonus, 0);
      for (let i = 0; i < thresholds.length; i++) {
        byId.__test.cost = thresholds[i];
        assert.equal(investment(["__test"], type).bonus, bonuses[type][i]);
        byId.__test.cost = thresholds[i] - 1;
        assert.equal(
          investment(["__test"], type).bonus,
          i ? bonuses[type][i - 1] : 0,
        );
      }
      byId.__test.cost = 40000;
      assert.equal(investment(["__test"], type).next, null);
    } finally {
      delete byId.__test;
    }
  }
});
test("investment uses equipped items, separates categories and ignores duplicates", () => {
  const w = items.find((i) => i.type === "Weapon" && i.cost === 800),
    s = items.find((i) => i.type === "Spirit" && i.cost === 800);
  assert.deepEqual(investment([w.id, w.id, s.id], "Weapon"), {
    souls: 800,
    bonus: 9,
    level: 0,
    next: 1600,
  });
  assert.equal(investment([w.id], "Vitality").souls, 0);
});
test("every upgrade consumes owned ancestors without double counting", () => {
  for (const i of items.filter((i) => i.components.length)) {
    const ids = [...ancestors(i.id)];
    const r = equip(ids, i.id);
    assert.equal(r.error, undefined, i.name);
    assert.deepEqual(r.ids, [i.id]);
    assert.equal(investment(r.ids, i.type).souls, i.cost);
    const c = ids[0];
    assert.ok(equip([i.id], c).error);
  }
});
test("removing an item removes its investment", () => {
  const i = items[0];
  assert.deepEqual(equip([i.id], i.id).ids, []);
  assert.equal(investment(equip([i.id], i.id).ids, i.type).souls, 0);
});
test("loadout respects universal slots and upgrade at capacity", () => {
  const basic = items
    .filter((i) => !i.active)
    .slice(0, 12)
    .map((i) => i.id);
  const extra = items.find(
    (i) => !i.active && !basic.includes(i.id) && !i.components.length,
  );
  assert.ok(equip(basic, extra.id).error);
  assert.ok(equip(basic.slice(0, 9), extra.id, 0).error);
  const upgrade = items.find(
    (i) => i.components.length && i.components.every((id) => byId[id]),
  );
  const component = upgrade.components[0];
  const fill = items
    .filter(
      (i) =>
        !i.active &&
        i.id !== component &&
        i.id !== upgrade.id &&
        !ancestors(i.id).has(upgrade.id) &&
        !ancestors(i.id).has(component),
    )
    .slice(0, 11)
    .map((i) => i.id);
  assert.ok(!equip([...fill, component], upgrade.id).error);
});
test("four active item maximum", () => {
  const active = items.filter((i) => i.active && !i.components.length);
  assert.ok(active.length >= 5);
  assert.ok(
    equip(
      active.slice(0, 4).map((i) => i.id),
      active[4].id,
    ).error,
  );
});
