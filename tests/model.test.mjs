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
} from "../src/model.js";
test("new drafts use four game-phase categories with only Optional flagged", () => {
  const d = makeDraft();
  assert.deepEqual(
    d.categories.map((c) => c.name),
    ["Early Game", "Mid Game", "Late Game", "Optional"],
  );
  assert.deepEqual(
    d.categories.map((c) => c.optional),
    [false, false, false, true],
  );
  assert.ok(validDraft(d));
  assert.deepEqual(
    JSON.parse(JSON.stringify(d)).categories.map((c) => c.optional),
    [false, false, false, true],
  );
  assert.equal(new Set(d.categories.map((c) => c.id)).size, 4);
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
