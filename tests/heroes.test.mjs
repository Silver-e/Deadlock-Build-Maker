import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  heroes,
  heroById,
  characterStats,
  abilityStats,
  baseAbilityStats,
  itemComparison,
  canImbue,
  imbueTarget,
  movementBonus,
} from "../src/heroes.js";
import { makeDraft, validDraft, items } from "../src/model.js";
const item = (name) => items.find((i) => i.name === name);
test("Abilities baseline ignores equipment, boons, imbues and combat conditions while retaining selected tiers", () => {
  const clean = {
    ...makeDraft(),
    heroId: "hero_inferno",
    abilityRanks: { 3: 3 },
  };
  const modified = {
    ...clean,
    boons: 35,
    equipped: items.map((i) => i.id),
    imbues: {},
    combat: { enabled: true, lycan: true },
  };
  for (const i of items.filter((i) => i.imbue)) modified.imbues[i.id] = "3";
  assert.deepEqual(baseAbilityStats(modified), baseAbilityStats(clean));
  assert.notDeepEqual(abilityStats(modified), baseAbilityStats(modified));
  assert.notDeepEqual(
    baseAbilityStats(clean),
    baseAbilityStats({ ...clean, abilityRanks: {} }),
  );
});
const draft = (changes = {}) => ({
  ...makeDraft(),
  heroId: "hero_inferno",
  ...changes,
});
const prop = (d, slot, key) =>
  abilityStats(d)
    .find((a) => a.slot === slot)
    .properties.find((p) => p.Key === key)?.total || 0;
const near = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 0.00001, `${actual} != ${expected}`);
test("move speed follows the wiki example of diminishing flat sources", () => {
  near(movementBonus([2, 3]), 4.5);
  near(movementBonus([]), 0);
});

test("hero snapshot has local portraits, complete abilities and finite calculations at every rank", () => {
  assert.ok(heroes.length >= 40);
  assert.equal(new Set(heroes.map((h) => h.id)).size, heroes.length);
  for (const h of heroes) {
    assert.ok(fs.existsSync(`public${h.portrait}`), h.name);
    assert.equal(h.abilities.length, 4);
    for (const a of h.abilities) {
      assert.ok(fs.existsSync(`public${a.icon}`), `${h.name} ${a.name}`);
      assert.ok(
        a.descriptions.length,
        `${h.name} ${a.name} needs a description`,
      );
    }
    for (const rank of [0, 1, 2, 3]) {
      const d = draft({
        heroId: h.id,
        boons: 35,
        abilityRanks: Object.fromEntries(
          ["1", "2", "3", "4"].map((s) => [s, rank]),
        ),
        equipped: [item("Boundless Spirit").id, item("Superior Cooldown").id],
      });
      assert.ok(
        characterStats(d).stats.every((p) => Number.isFinite(p.total)),
        h.name,
      );
      assert.ok(
        abilityStats(d).every((a) =>
          a.properties.every((p) => Number.isFinite(p.total)),
        ),
        h.name,
      );
    }
  }
});

test("legacy drafts preserve item-only calculations without selecting a character", () => {
  const d = makeDraft();
  for (const key of [
    "heroId",
    "boons",
    "abilityRanks",
    "imbues",
    "previewAbility",
  ])
    delete d[key];
  assert.equal(validDraft(d), true);
  assert.equal(characterStats(d), null);
  assert.deepEqual(abilityStats(d), []);
  assert.equal(itemComparison(d, item("Extra Spirit")), null);
  assert.equal(validDraft(draft({ boons: -1 })), false);
  assert.equal(validDraft(draft({ abilityRanks: { 1: 4 } })), false);
});

test("hero health, boon spirit, investments and flat spirit share the correct bases", () => {
  const d = draft({ boons: 10, equipped: [item("Extra Spirit").id] });
  near(characterStats(d).spirit, 10 * 1.1 + 10 + 7);
  near(
    characterStats(d).stats.find((s) => s.label === "Max Health").total,
    830 + 39 * 10,
  );
  near(prop(d, "1", "Damage"), 40 + 0.6 * 28);
  const boundless = draft({
    boons: 10,
    equipped: [item("Boundless Spirit").id],
  });
  near(characterStats(boundless).spirit, (11 + 30 + 45) * 1.15);
});

test("duration imbue affects its assigned ability and only duration-scaled properties", () => {
  const id = item("Duration Extender").id;
  const d = draft({ equipped: [id], imbues: { [id]: "3" } });
  near(prop(d, "3", "BurnDuration"), 3 * 1.22);
  near(prop(d, "3", "BurnDurationBase"), 3);
  near(prop(d, "1", "SlowDuration"), 4);
  near(prop(d, "4", "StunDuration"), 1.25);
  const compare = itemComparison(
    draft({ previewAbility: "3" }),
    item("Duration Extender"),
  );
  assert.equal(compare.target, "3");
  assert.equal(
    compare.abilities
      .find((a) => a.slot === "3")
      .changes.find((p) => p.Key === "BurnDuration").after,
    3.66,
  );
  assert.ok(
    !compare.abilities.some(
      (a) => a.slot === "1" && a.changes.some((p) => p.Key === "SlowDuration"),
    ),
  );
});

test("cumulative ability upgrades add base values and scaling coefficients", () => {
  const d = draft({ boons: 10, abilityRanks: { 4: 3 } });
  near(prop(d, "4", "StunDuration"), 2.15);
  near(prop(d, "4", "AbilityCooldown"), 125);
  near(prop(d, "4", "Damage"), 225 + (0.974938 + 0.4) * 11);
  near(prop(d, "4", "Radius"), 22);
});
test("upgrades that introduce charges receive charge bonuses only after that tier", () => {
  const d = draft({ equipped: [item("Extra Charge").id] });
  near(prop(d, "2", "AbilityCharges"), 0);
  near(prop(d, "2", "AbilityCooldownBetweenCharge"), 0);
  const ranked = { ...d, abilityRanks: { 2: 3 } };
  near(prop(ranked, "2", "AbilityCharges"), 3);
  const chargedRows = abilityStats(ranked).find(
    (a) => a.slot === "2",
  ).properties;
  assert.ok(
    chargedRows.find((p) => p.Key === "AbilityCooldownBetweenCharge").total > 0,
  );
  near(
    prop(
      draft({ abilityRanks: { 2: 3 } }),
      "2",
      "AbilityCooldownBetweenCharge",
    ),
    14,
  );
});

test("general and imbued cooldown reductions multiply, with only one imbue target", () => {
  const imbue = item("Compress Cooldown").id;
  const d = draft({
    equipped: [imbue, item("Superior Duration").id],
    imbues: { [imbue]: "1" },
  });
  near(prop(d, "1", "AbilityCooldown"), 25 * 0.82);
  near(prop(d, "2", "AbilityCooldown"), 38);
  // Both the innate global duration and the always-on passive participate.
  assert.ok(prop(d, "1", "SlowDuration") > 4);
});

test("preview consumes components and equipped previews compare removal against current loadout", () => {
  const component = item("Extra Spirit"),
    upgrade = item("Improved Spirit");
  const d = draft({ equipped: [component.id] });
  const c = itemComparison(d, upgrade);
  assert.deepEqual(c.replaced, [component.id]);
  near(
    c.abilities[0].changes.find((p) => p.Key === "Damage").after,
    prop(draft({ equipped: [upgrade.id] }), "1", "Damage"),
  );
  const full = draft({ equipped: [upgrade.id] });
  assert.ok(itemComparison(full, component).blocked);
  const current = itemComparison(full, upgrade);
  assert.equal(current.equipped, true);
  near(
    current.abilities[0].changes.find((p) => p.Key === "Damage").after,
    prop(full, "1", "Damage"),
  );
});

test("imbue restrictions and persisted targets match passive and ultimate rules", () => {
  const h = heroById.hero_inferno;
  assert.equal(canImbue(item("Mystic Expansion"), h.abilities[2]), true);
  assert.equal(canImbue(item("Duration Extender"), h.abilities[2]), true);
  assert.equal(canImbue(item("Surge of Power"), h.abilities[2]), false);
  assert.equal(canImbue(item("Echo Shard"), h.abilities[3]), false);
  const d = draft({ previewAbility: "3" });
  assert.equal(imbueTarget(d, item("Surge of Power")), "1");
  const id = item("Surge of Power").id;
  const boosted = draft({ equipped: [id], imbues: { [id]: "2" } });
  const unboosted = { ...boosted, imbues: { [id]: "1" } };
  near(prop(boosted, "2", "DPS") - prop(unboosted, "2", "DPS"), 28 * 0.7);
});

test("Paradox uses full-burst weapon scaling; melee conversions replace the old scaling", () => {
  const p = draft({ heroId: "hero_chrono" });
  near(prop(p, "3", "MaxBonusBulletDamage"), 6.8 * 5 * 2.25);
  near(prop(p, "3", "MinBonusBulletDamage"), 6.8 * 5 * 1.1);
  const v = draft({ heroId: "hero_viscous", abilityRanks: { 3: 3 } });
  near(prop(v, "3", "DamageHeavyMelee"), 40 + 0.6 * 116);
  near(prop(v, "3", "Damage"), 0);
});
