import { test } from "node:test";
import assert from "node:assert/strict";
import { makeDraft, items, validDraft } from "../src/model.js";
import { characterStats, heroes, heroById } from "../src/heroes.js";
import { combineStat } from "../src/stats.js";
import {
  combatStats,
  combatOptions,
  heroCombatOptions,
} from "../src/combat.js";

const item = (name) => items.find((item) => item.name === name).id;
const draft = (heroId = "hero_werewolf") => ({
  ...makeDraft(),
  heroId,
  combat: { enabled: true, effects: {} },
});
const stat = (result, label) =>
  result.rows.find((row) => row.label === label)?.total;
const near = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 0.00001, `${actual} != ${expected}`);
const selectHero = (d, slot, label, count = 1) => {
  const option = heroCombatOptions(d).find(
    (option) => option.ability.slot === slot && option.label === label,
  );
  assert.ok(option, `${d.heroId} ability ${slot}: ${label}`);
  d.combat.effects[option.key] = count;
};
const selectItem = (d, name, count = 1) => {
  const option = combatOptions(d.equipped).find(
    (option) => option.item.name === name,
  );
  assert.ok(option, name);
  d.combat.effects[option.key] = count;
};

test("combined calculation works for every character and defaults to standing stats", () => {
  for (const hero of heroes) {
    const d = draft(hero.id);
    d.equipped = [item("Spirit Resilience"), item("Extended Magazine")];
    const before = structuredClone(d);
    const result = combatStats(d);
    for (const row of characterStats(d).stats) {
      if (
        hero.id === "hero_werewolf_transformed" &&
        ["Max Health", "Move Speed", "Sprint Speed"].includes(row.label)
      )
        continue;
      near(stat(result, row.label), row.total);
    }
    assert.ok(
      result.rows.every((row) => Number.isFinite(row.total)),
      hero.name,
    );
    assert.deepEqual(d, before);
  }
});
test("all modeled hero buffs remain finite together at every ability tier", () => {
  for (const hero of heroes)
    for (const rank of [0, 1, 2, 3]) {
      const d = draft(hero.id);
      d.boons = 35;
      d.abilityRanks = { 1: rank, 2: rank, 3: rank, 4: rank };
      d.equipped = [item("Boundless Spirit"), item("Spirit Lifesteal")];
      for (const option of heroCombatOptions(d))
        d.combat.effects[option.key] = 1;
      const result = combatStats(d);
      assert.ok(
        result.rows.every((row) => Number.isFinite(row.total)),
        `${hero.name}, tier ${rank}`,
      );
    }
});

test("Silver tier 1, permanent equipment and conditional resists multiply independently", () => {
  const d = draft();
  d.equipped = [
    item("Spirit Resilience"),
    item("Bullet Resilience"),
    item("Colossus"),
    item("Warp Stone"),
  ];
  d.abilityRanks = { 4: 1 };
  d.combat.lycan = true;
  for (const name of [
    "Spirit Resilience",
    "Bullet Resilience",
    "Colossus",
    "Warp Stone",
  ])
    selectItem(d, name);
  const result = combatStats(d);
  near(stat(result, "Spirit Resist"), 100 * (1 - 0.7 * 0.85 * 0.65 * 0.85));
  near(
    stat(result, "Bullet Resist"),
    100 * (1 - 0.65 * 0.85 * 0.65 * 0.7 * 0.85),
  );
  assert.equal(result.context.hero.id, "hero_werewolf_transformed");
  assert.equal(result.standing.hero.id, "hero_werewolf");
  d.abilityRanks["4"] = 0;
  near(stat(combatStats(d), "Spirit Resist"), 100 * (1 - 0.7 * 0.85 * 0.65));
  d.combat.lycan = false;
  assert.equal(combatStats(d).context.hero.id, "hero_werewolf");
});

test("Silver fire rate scales by the chosen stacks and scenario spirit, without assuming maximum stacks", () => {
  const d = draft();
  d.boons = 10;
  d.combat.lycan = true;
  d.equipped = [item("Infuser")];
  selectItem(d, "Infuser");
  let result = combatStats(d);
  near(stat(result, "Fire Rate"), 2);
  d.combat.lycanStacks = 5;
  result = combatStats(d);
  near(
    stat(result, "Fire Rate"),
    2 * (1 + (60 + 0.45 * result.context.spirit) / 3 / 100),
  );
  d.combat.lycanStacks = 15;
  result = combatStats(d);
  near(
    stat(result, "Fire Rate"),
    2 * (1 + (60 + 0.45 * result.context.spirit) / 100),
  );
});

test("Warden, Yamato and Viscous ability resists use their own upgrades and the shared stacking model", () => {
  for (const [name, base, upgraded] of [
    ["Warden", 50, 80],
    ["Yamato", 30, 60],
    ["Viscous", 35, 55],
  ]) {
    const hero = heroes.find((hero) => hero.name === name);
    const d = draft(hero.id);
    d.equipped = [item("Spirit Resilience")];
    selectHero(d, "4", "Spirit Resist");
    near(
      stat(combatStats(d), "Spirit Resist"),
      100 * (1 - 0.7 * (1 - base / 100)),
    );
    d.abilityRanks = { 4: 3 };
    selectItem(d, "Spirit Resilience");
    near(
      stat(combatStats(d), "Spirit Resist"),
      100 * (1 - 0.7 * 0.85 * (1 - upgraded / 100)),
    );
  }
});

test("upgrades with no default property are selectable for every character", () => {
  const yamato = draft("hero_yamato");
  yamato.abilityRanks = { 4: 1 };
  selectHero(yamato, "4", "Flat Bullet Damage");
  near(
    stat(combatStats(yamato), "Bullet Damage"),
    characterStats(yamato).bullet + 7,
  );
  const haze = draft("hero_haze");
  selectHero(haze, "4", "Fire Rate");
  near(
    stat(combatStats(haze), "Fire Rate"),
    characterStats(haze).stats.find((s) => s.label === "Fire Rate").total *
      1.25,
  );
});

test("percentage movement and regeneration rate bonuses are distinct from flat speed and cooldown reduction", () => {
  const d = draft("hero_warden");
  selectHero(d, "2", "Move Speed bonus");
  near(
    stat(combatStats(d), "Move Speed"),
    characterStats(d).stats.find((s) => s.label === "Move Speed").total * 1.2,
  );
  const violet = draft(heroes.find((hero) => hero.name === "Violet").id);
  violet.abilityRanks = { 2: 1 };
  selectHero(violet, "2", "Stamina Regeneration");
  near(
    stat(combatStats(violet), "Stamina Recovery"),
    heroById[violet.heroId].base.StaminaCooldown / 2.5,
  );
});

test("resistance reductions stack separately and subtract from the positive resistance total", () => {
  near(combineStat("Bullet Resist", [40, 20, -25, -20]), 12);
  const d = draft();
  d.combat.extra = [40, 20, -25, -20].map((value, index) => ({
    id: String(index),
    label: "Bullet Resist",
    name: `Source ${index}`,
    value,
  }));
  near(stat(combatStats(d), "Bullet Resist"), 12);
  near(stat(combatStats(d), "Spirit Resist"), 0);
});

test("item stack counts stay within their cap and unequipping removes selected effects", () => {
  const d = draft("hero_inferno");
  d.equipped = [item("Berserker"), item("Glass Cannon"), item("Spellslinger")];
  selectItem(d, "Berserker", 1000);
  selectItem(d, "Glass Cannon", 2);
  selectItem(d, "Spellslinger", 3);
  const result = combatStats(d);
  near(result.sources.find((s) => s.name === "Berserker").value, 70);
  near(result.sources.find((s) => s.name === "Glass Cannon").value, 14);
  near(
    result.sources.find(
      (s) => s.name === "Spellslinger" && s.label === "Reload Time",
    ).value,
    30,
  );
  d.equipped = [];
  assert.equal(combatStats(d).sources.length, 0);
});

test("enemy, summon and ability-scoped effects are not promoted to character buffs", () => {
  const d = draft();
  d.equipped = [
    item("Spirit Sap"),
    item("Mystic Expansion"),
    item("Express Shot"),
  ];
  assert.equal(combatOptions(d.equipped).length, 0);
  assert.ok(
    !heroCombatOptions(draft("hero_necro")).some(
      (option) => option.ability.slot === "4",
    ),
  );
  assert.ok(
    !heroCombatOptions(
      draft(heroes.find((h) => h.name === "McGinnis").id),
    ).some((option) => option.ability.slot === "1"),
  );
  assert.ok(
    !heroCombatOptions(draft("hero_warden")).some(
      (option) => option.ability.slot === "1",
    ),
  );
});

test("combat selections survive save round trips and invalid scenarios are rejected", () => {
  const d = draft();
  d.combat.lycan = true;
  d.combat.lycanStacks = 3;
  assert.ok(validDraft(JSON.parse(JSON.stringify(d))));
  d.combat.lycanStacks = 16;
  assert.equal(validDraft(d), false);
  d.combat.lycanStacks = 0;
  d.combat.extra = {};
  assert.equal(validDraft(d), false);
});
