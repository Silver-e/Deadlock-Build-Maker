import { test } from "node:test";
import assert from "node:assert/strict";
import { items } from "../src/model.js";
import { equippedStats, parseStat, combine } from "../src/stats.js";
const ids = (...names) =>
  names.map((name) => {
    const item = items.find((i) => i.name === name);
    assert.ok(item, name);
    return item.id;
  });
const row = (result, name) => result.rows.find((r) => r.label === name);
const near = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 0.00001, `${actual} != ${expected}`);
test("all innate stat lines and all item effects remain accounted for", () => {
  for (const item of items) {
    for (const text of item.stats)
      assert.ok(parseStat(text), item.name + ": " + text);
    const result = equippedStats([item.id]);
    assert.equal(
      result.effects.filter((e) => e.kind !== "Scoped").length,
      item.effectGroups.length,
    );
  }
});
test("weapon investment is included and duplicates are not counted twice", () => {
  near(
    row(
      equippedStats(ids("Extended Magazine", "Extended Magazine")),
      "Weapon Damage",
    ).total,
    17,
  );
});
test("resistance multiplies and health-triggered resistance remains conditional", () => {
  const result = equippedStats(
    ids("Enchanter's Emblem", "Cold Front", "Spirit Resilience"),
  );
  near(row(result, "Spirit Resist").total, 46.044);
  const conditional = row(result, "Spirit Resist").conditional;
  assert.equal(conditional.length, 1);
  assert.equal(conditional[0].name, "Spirit Resilience");
  assert.equal(conditional[0].value, 15);
});
test("range follows the wiki example: 30% plus 10% gives 37%", () => {
  const result = equippedStats(ids("Greater Expansion", "Divine Barrier"));
  near(row(result, "Ability Range").total, 37);
});
test("imbued range does not inflate all abilities", () => {
  const result = equippedStats(ids("Mystic Expansion"));
  assert.equal(row(result, "Ability Range").total, 0);
  assert.equal(
    row(result, "Ability Range").conditional[0].classification,
    "Imbued",
  );
});
test("cooldowns multiply, conditional cooldown reduction is excluded", () => {
  const result = equippedStats(
    ids("Superior Cooldown", "Spellslinger", "Enchanter's Emblem"),
  );
  near(row(result, "Ability Cooldown Reduction").total, 24);
  assert.equal(
    row(result, "Ability Cooldown Reduction").conditional[0].value,
    5,
  );
});
test("flat spirit plus investment is increased by percentage spirit", () => {
  const result = equippedStats(ids("Boundless Spirit", "Spirit Lifesteal"));
  near(row(result, "Spirit Power").total, 95.45);
});
test("unconditional tooltip passives are included in permanent totals", () => {
  const result = equippedStats(
    ids(
      "Debuff Reducer",
      "Healing Booster",
      "Transcendent Cooldown",
      "Superior Duration",
    ),
  );
  near(row(result, "Debuff Resist").total, 25);
  near(row(result, "Outgoing Healing").total, 20);
  near(row(result, "Item Cooldown Reduction").total, 25);
  near(row(result, "Ability Duration").total, 28);
});
test("enemy debuffs do not subtract own resistances or fire rate", () => {
  const result = equippedStats(ids("Spirit Sap", "Rusted Barrel"));
  near(row(result, "Spirit Resist").total, 0);
  near(row(result, "Fire Rate").total, 0);
  assert.equal(row(result, "Spirit Resist").conditional.length, 0);
  assert.ok(result.effects.some((e) => e.stats.includes("-9% Spirit Resist")));
});
test("active buffs, stack requirements and source icons have item identifiers", () => {
  const result = equippedStats(ids("Fury Trance", "Spellslinger"));
  assert.ok(
    row(result, "Spirit Resist").conditional.some(
      (s) => s.classification === "Active" && s.id,
    ),
  );
  assert.ok(
    row(result, "Fire Rate").conditional.some(
      (s) => s.classification === "Stacking" && /stack/.test(s.condition),
    ),
  );
});
test("lifesteal and duration use multiplicative stacking, removing equipment removes stats", () => {
  near(combine([15, 30], "diminish"), 40.5);
  near(combine([15, 15], "diminish"), 27.75);
  const result = equippedStats([]);
  assert.ok(
    result.rows.every((r) => r.total === 0 && r.conditional.length === 0),
  );
  assert.equal(result.effects.length, 0);
});

// Stat filtering must include bonuses beyond the permanent stat rows.
import { itemMatchesStat, itemStatLabels } from "../src/itemSearch.js";
test("stat search includes permanent, conditional, active and prose bonuses", () => {
  for (const item of items) {
    for (const line of [
      ...item.stats,
      ...item.effectGroups.flatMap((e) => e.stats),
    ]) {
      const stat = parseStat(line);
      if (stat)
        assert.ok(itemMatchesStat(item, stat.label), `${item.name}: ${line}`);
    }
  }
  assert.ok(
    itemMatchesStat(
      items.find((i) => i.name === "Close Quarters"),
      "  WEAPON damage ",
    ),
  );
  assert.ok(
    itemMatchesStat(
      {
        effectGroups: [
          {
            kind: "Active",
            description: "Gain movement speed after activation",
          },
        ],
      },
      "movement speed",
    ),
  );
  assert.ok(
    !itemMatchesStat({ name: "Spirit Power", stats: [] }, "spirit power"),
  );
  assert.ok(itemMatchesStat({}, "  "));
  assert.ok(itemStatLabels(items).includes("Weapon Damage"));
});
