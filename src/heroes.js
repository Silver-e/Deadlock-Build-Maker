import snapshot from "../data/heroes.json" with { type: "json" };
import { byId, ancestors } from "./model.js";
import { equippedStats, combine, combineStat, parseStat } from "./stats.js";

export const heroes = snapshot.heroes;
export const heroById = Object.fromEntries(heroes.map((h) => [h.id, h]));
export const heroSnapshot = snapshot;
export const boonLevel = (draft) =>
  Math.max(0, Math.min(35, Math.trunc(Number(draft.boons) || 0)));
export const abilityRank = (draft, slot) =>
  Math.max(0, Math.min(3, Math.trunc(Number(draft.abilityRanks?.[slot]) || 0)));
export const movementBonus = (values) =>
  12 *
  (1 - values.reduce((remaining, value) => remaining * (1 - value / 12), 1));

export function canImbue(item, ability) {
  if (!item?.imbue || !ability) return false;
  if (item.name === "Echo Shard" && ability.slot === "4") return false;
  return (
    !ability.passive ||
    ["Mystic Expansion", "Duration Extender"].includes(item.name)
  );
}

// The selected preview target also becomes the initial target when equipping an imbue.
export function imbueTarget(draft, item) {
  const hero = heroById[draft.heroId];
  if (!hero || !item?.imbue) return null;
  const selected = draft.imbues?.[item.id] || draft.previewAbility || "1";
  return (
    hero.abilities.find((a) => a.slot === selected && canImbue(item, a))
      ?.slot ||
    hero.abilities.find((a) => canImbue(item, a))?.slot ||
    null
  );
}

function bonusContext(ids, additionalSources = []) {
  const stats = equippedStats(ids, additionalSources);
  const rows = Object.fromEntries(stats.rows.map((r) => [r.label, r]));
  const get = (name) => rows[name]?.total || 0;
  const values = (name) => (rows[name]?.sources || []).map((s) => s.value);
  return { rows, get, values };
}

export function characterStats(
  draft,
  ids = draft.equipped,
  additionalSources = [],
) {
  const hero = heroById[draft.heroId];
  if (!hero) return null;
  const bonus = bonusContext(ids, additionalSources),
    { get } = bonus,
    boons = boonLevel(draft);
  const spiritMultiplier = 1 + get("Spirit power multiplier") / 100;
  // equippedStats already multiplies its item-only spirit row. Rebuild the flat sum
  // so innate/boon spirit is inside that same multiplier, exactly once.
  const spirit =
    ((hero.base.TechPower || 0) +
      (hero.level.TechPower || 0) * boons +
      bonus.values("Spirit Power").reduce((a, b) => a + b, 0)) *
    spiritMultiplier;
  const raw = (key) =>
    (hero.base[key] ?? hero.weapon?.[key] ?? 0) +
    (hero.level[key] || 0) * boons +
    (hero.spirit[key] || 0) * spirit;
  const weaponBonus = get("Weapon Damage");
  const weaponMultiplier =
    1 + (weaponBonus / 100) * (hero.base.WeaponPowerScale ?? 1);
  const bullet =
    (raw("BulletDamage") + get("Flat Bullet Damage")) * weaponMultiplier;
  const pellets = hero.weapon?.BulletsPerShot || 1;
  const fireRate = raw("RoundsPerSecond") * (1 + get("Fire Rate") / 100);
  const lightMelee =
    raw("LightMeleeDamage") *
    (1 + weaponBonus / 200 + get("Melee Damage") / 100);
  const heavyMelee =
    raw("HeavyMeleeDamage") *
    (1 + weaponBonus / 200 + get("Melee Damage") / 100);
  const health = Math.ceil(
    (raw("MaxHealth") * (1 + get("Health bonus") / 100) + get("Bonus Health")) *
      (1 + get("Max Health") / 100),
  );
  const moveSpeed =
    raw("MaxMoveSpeed") * (1 + get("Move Speed bonus") / 100) +
    movementBonus(bonus.values("Move Speed"));
  const bulletResist = combineStat("Bullet Resist", [
    raw("BulletResist"),
    ...bonus.values("Bullet Resist"),
  ]);
  const spiritResist = combineStat("Spirit Resist", [
    raw("TechResist"),
    ...bonus.values("Spirit Resist"),
  ]);
  const stats = [
    [
      "Weapon",
      "Bullet Damage",
      bullet,
      "",
      "Per pellet, before falloff and enemy resistance.",
    ],
    [
      "Weapon",
      "Weapon DPS",
      bullet * pellets * fireRate,
      "/s",
      "Continuous firing; excludes reloads, headshots and triggered effects.",
    ],
    ["Weapon", "Fire Rate", fireRate, "/s"],
    [
      "Weapon",
      "Max Ammo",
      Math.ceil(raw("ClipSize") * (1 + get("Max Ammo") / 100)),
      "",
    ],
    [
      "Weapon",
      "Reload Time",
      raw("ReloadTime") * (1 - get("Reload Time") / 100),
      "s",
    ],
    ["Weapon", "Light Melee Damage", lightMelee, ""],
    ["Weapon", "Heavy Melee Damage", heavyMelee, ""],
    ["Spirit", "Spirit Power", spirit, ""],
    ["Spirit", "Ability Range", get("Ability Range"), "%"],
    ["Spirit", "Ability Duration", get("Ability Duration"), "%"],
    [
      "Spirit",
      "Ability Cooldown Reduction",
      get("Ability Cooldown Reduction"),
      "%",
    ],
    ["Vitality", "Max Health", health, ""],
    [
      "Vitality",
      "Health Regen",
      raw("BaseHealthRegen") + get("Health Regen"),
      "/s",
    ],
    ["Vitality", "Bullet Resist", bulletResist, "%"],
    ["Vitality", "Spirit Resist", spiritResist, "%"],
    ["Vitality", "Move Speed", moveSpeed, "m/s"],
    [
      "Vitality",
      "Sprint Speed",
      moveSpeed + raw("SprintSpeed") + get("Sprint Speed"),
      "m/s",
      "Movement speed while sprinting.",
    ],
    ["Vitality", "Stamina", raw("Stamina") + get("Stamina"), ""],
    [
      "Vitality",
      "Stamina Recovery",
      (raw("StaminaCooldown") * (1 - get("Stamina Recovery") / 100)) /
        Math.max(0.0001, 1 + get("Stamina Regeneration") / 100),
      "s",
    ],
  ].map(([group, label, total, unit, note]) => ({
    group,
    label,
    total,
    unit,
    note,
  }));
  return {
    hero,
    boons,
    spirit,
    weaponBonus,
    weaponMultiplier,
    bullet,
    lightMelee,
    heavyMelee,
    burstDamage: bullet * (hero.weapon?.BulletsPerBurst || 1),
    bonus,
    stats,
  };
}

const scales = (value) => [value].flat().filter(Boolean);
function abilityProperties(ability) {
  const props = [...ability.properties];
  // The wiki omits these headers when an ability gains charges only at an
  // upgrade (for example Flame Dash T3). They still need an explicit baseline.
  for (const [Key, Name, type, unit] of [
    ["AbilityCharges", "Charges", "max_charges", ""],
    ["AbilityCooldownBetweenCharge", "Charge Delay", "charge_cooldown", "s"],
  ]) {
    if (
      !props.some((p) => p.Key === Key) &&
      ability.upgrades.some((upgrade) => Number(upgrade[Key]) > 0)
    )
      props.push({
        Key,
        Name,
        Value: 0,
        Scale: { Value: 1, Type: type },
        unit,
      });
  }
  return props;
}
export function upgradedProperty(prop, ability, rank) {
  const result = {
    ...prop,
    Value: Number(prop.Value),
    Scale: scales(prop.Scale).map((s) => ({ ...s })),
  };
  if (
    prop.Key === "AbilityCooldownBetweenCharge" &&
    result.Value < 0 &&
    ability.upgrades
      .slice(0, rank)
      .some((upgrade) => Number(upgrade[prop.Key]) > 0)
  )
    result.Value = 0;
  for (const upgrade of ability.upgrades.slice(0, rank)) {
    const delta = upgrade[prop.Key];
    if (delta === undefined) continue;
    if (typeof delta !== "object") {
      result.Value += parseFloat(delta) || 0;
      continue;
    }
    if (delta.Value !== undefined) {
      if (delta.Multiply) result.Value *= Number(delta.Value);
      else result.Value += Number(delta.Value);
    }
    for (const change of scales(delta.Scale)) {
      const old = result.Scale.find((s) => s.Type === change.Type);
      if (old)
        old.Value = change.Multiply
          ? old.Value * change.Value
          : old.Value + change.Value;
      else result.Scale.push({ ...change });
    }
  }
  return result;
}

function abilityModifiers(draft, ability, ids, context) {
  const { get, values } = context.bonus;
  const modifiers = {
    spirit: context.spirit,
    range: values("Ability Range"),
    duration: values("Ability Duration"),
    cooldown: values("Ability Cooldown Reduction"),
    charge: values("Faster Time Between Charges"),
    charges: get("Bonus Ability Charges"),
    healing: get("Outgoing Healing"),
  };
  const rank = abilityRank(draft, ability.slot);
  const charges = abilityProperties(ability).find(
    (p) => p.Key === "AbilityCharges",
  );
  const charged = charges && upgradedProperty(charges, ability, rank).Value > 0;
  if (!charged) modifiers.charges = 0;
  if (charged) {
    modifiers.spirit += get("Charged ability spirit power");
    modifiers.cooldown.push(
      ...values("Cooldown Reduction For Charged Abilities"),
    );
  }
  if (ability.slot === "4")
    modifiers.cooldown.push(...values("Ultimate Cooldown Reduction"));
  for (const id of ids) {
    const item = byId[id];
    if (!item?.imbue || imbueTarget(draft, item) !== ability.slot) continue;
    // Only the permanent part of the imbue is applied. Damage procs / temporary
    // fire rate / lifesteal remain in the item tooltip and conditional stat rows.
    for (const effect of item.effectGroups || [])
      for (const text of effect.stats) {
        const s = parseStat(text);
        if (!s) continue;
        if (s.label === "Ability Range") modifiers.range.push(s.value);
        if (s.label === "Ability Duration") modifiers.duration.push(s.value);
        if (s.label === "Ability Cooldown Reduction")
          modifiers.cooldown.push(s.value);
        if (/Imbued Ability Spirit Power$/.test(s.label))
          modifiers.spirit += s.value;
      }
  }
  return modifiers;
}

export function abilityStats(
  draft,
  ids = draft.equipped,
  additionalSources = [],
) {
  const context = characterStats(draft, ids, additionalSources);
  if (!context) return [];
  return context.hero.abilities.map((ability) => {
    const rank = abilityRank(draft, ability.slot);
    const mod = abilityModifiers(draft, ability, ids, context);
    const properties = abilityProperties(ability)
      .map((p) => {
        const prop = upgradedProperty(p, ability, rank);
        let value = prop.Value;
        for (const s of prop.Scale) {
          if (s.Type === "spirit") value += s.Value * mod.spirit;
          if (s.Type === "power_increase") value += s.Value * context.boons;
          if (s.Type === "weapon_damage_increase")
            value += s.Value * context.weaponBonus;
          if (s.Type === "melee") value += s.Value * context.lightMelee;
          if (s.Type === "heavy_melee") value += s.Value * context.heavyMelee;
          // Kinetic Carbine's value is a count of bullets, not flat damage.
          if (s.Type === "weapon_power")
            value = context.burstDamage * (1 + s.Value / 100);
          if (s.Type === "max_charges") value += mod.charges;
        }
        for (const s of prop.Scale) {
          if (s.Type === "duration")
            value *= 1 + (combine(mod.duration, "diminish") / 100) * s.Value;
          if (s.Type === "range" || s.Type === "radius")
            value *= 1 + (combine(mod.range, "diminish") / 100) * s.Value;
          if (s.Type === "cooldown")
            value *= 1 - (combine(mod.cooldown, "diminish") / 100) * s.Value;
          if (s.Type === "charge_cooldown")
            value *= 1 - (combine(mod.charge, "diminish") / 100) * s.Value;
          if (s.Type === "healing") value *= 1 + (mod.healing / 100) * s.Value;
          if (s.Type === "weapon_damage") value *= context.weaponMultiplier;
        }
        return {
          ...prop,
          total: value,
          label: prop.Title
            ? `${prop.Title.replace(/:$/, "")} · ${prop.Name}`
            : prop.Name,
        };
      })
      .filter(
        (p) =>
          Math.abs(p.total) > 0.00001 &&
          !(
            p.Value < 0 &&
            [
              "AbilityCooldown",
              "AbilityCooldownBetweenCharge",
              "AbilityCastRange",
              "ChannelMoveSpeed",
            ].includes(p.Key)
          ) &&
          !p.Name.startsWith("Unknown("),
      );
    return { ...ability, rank, properties };
  });
}

export function itemComparison(draft, item) {
  if (!heroById[draft.heroId] || !item) return null;
  const equipped = draft.equipped.includes(item.id);
  if (!equipped && draft.equipped.some((id) => ancestors(id).has(item.id)))
    return {
      blocked: "An equipped upgrade already includes this component.",
      abilities: [],
    };
  const beforeIds = equipped
    ? draft.equipped.filter((id) => id !== item.id)
    : draft.equipped;
  const afterIds = equipped
    ? draft.equipped
    : [...draft.equipped.filter((id) => !ancestors(item.id).has(id)), item.id];
  const before = abilityStats(draft, beforeIds),
    after = abilityStats(draft, afterIds);
  const abilities = after
    .map((ability, i) => ({
      ...ability,
      changes: ability.properties
        .map((prop) => {
          const old = before[i].properties.find((p) => p.Key === prop.Key);
          return { ...prop, before: old?.total || 0, after: prop.total };
        })
        .filter((p) => Math.abs(p.after - p.before) > 0.00001),
    }))
    .filter((a) => a.changes.length);
  const replaced = equipped
    ? []
    : draft.equipped.filter((id) => ancestors(item.id).has(id));
  const target = imbueTarget(draft, item);
  return {
    equipped,
    abilities,
    replaced,
    target,
    hypothetical:
      !equipped &&
      (afterIds.length > 9 + draft.extra ||
        afterIds.filter((id) => byId[id]?.active).length > 4),
  };
}
