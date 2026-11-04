import { byId } from "./model.js";
import {
  equippedStats,
  parseStat,
  classifyEffect,
  statRules,
} from "./stats.js";
import {
  heroById,
  characterStats,
  upgradedProperty,
  abilityRank,
  boonLevel,
} from "./heroes.js";

export const defaultCombat = {
  enabled: false,
  lycan: false,
  lycanStacks: 0,
  effects: {},
  extra: [],
};
export const isSilver = (id) =>
  ["hero_werewolf", "hero_werewolf_transformed"].includes(id);

// Explicit attribute semantics: damage, slows, healing pulses and summon stats
// must never be inferred to be a character-wide buff from a friendly label.
const heroBuffKeys = {
  BulletResist: "Bullet Resist",
  TechResist: "Spirit Resist",
  MeleeResist: "Melee Resist",
  BulletResistOnActive: "Bullet Resist",
  TechArmorGain: "Spirit Resist",
  SpiritResist: "Spirit Resist",
  MaxStolenSpiritResist: "Spirit Resist",
  StatusResistancePercent: "Debuff Resist",
  BonusMoveSpeed: "Move Speed",
  MovementSpeedBonus: "Move Speed",
  MoveSpeedBonus: "Move Speed",
  SpeedOnLand: "Move Speed",
  SpeedChange: "Move Speed bonus",
  SlowResistance: "Slow Resist",
  BonusSprintSpeed: "Sprint Speed",
  SprintSpeedBonus: "Sprint Speed",
  BonusMoveSpeedPercent: "Move Speed bonus",
  MoveSpeedBonusPct: "Move Speed bonus",
  MaxBonusMoveSpeedPercent: "Move Speed bonus",
  BonusFireRate: "Fire Rate",
  WeaponFireRateBonus: "Fire Rate",
  AuraFireRateBonus: "Fire Rate",
  BonusFireRatePerStack: "Fire Rate",
  FireRatePerStack: "Fire Rate",
  FireRatePerHero: "Fire Rate",
  BonusFireRatePerHero: "Fire Rate",
  MaxStolenFireRate: "Fire Rate",
  FireRatePerLeechPickup: "Fire Rate",
  BonusHealth: "Bonus Health",
  BonusMaxHealth: "Bonus Health",
  BonusMaxHealthPerHero: "Bonus Health",
  MaxHealthMelee: "Bonus Health",
  MaxHealthBuffPct: "Max Health",
  BonusHealthOnKill: "Bonus Health",
  WeaponDamageBonusPerKill: "Weapon Damage",
  WeaponDmgPerIsolationKill: "Weapon Damage",
  BonusClipSizePercent: "Max Ammo",
  HealthRegen: "Health Regen",
  BonusHealthRegen: "Health Regen",
  ExternalBonusHealthRegen: "Health Regen",
  HealRegen: "Health Regen",
  TechPower: "Spirit Power",
  BonusSpiritPower: "Spirit Power",
  SpiritBonus: "Spirit Power",
  BonusTechPowerPerKill: "Spirit Power",
  SpiritPowerPerLeechStack: "Spirit Power",
  RegenPerLeechPickup: "Health Regen",
  TechPowerPercent: "Spirit power multiplier",
  Stamina: "Stamina",
  StaminaCooldownReduction: "Stamina Regeneration",
  MeleeLifesteal: "Melee Lifesteal",
  BulletLifesteal: "Bullet Lifesteal",
  BulletLifestealPercent: "Bullet Lifesteal",
  TechLifestealPercent: "Spirit Lifesteal",
  BuffMeleeDamage: "Melee Damage",
  BuffBaseWeaponPct: "Weapon Damage",
  WeaponDamageBurst: "Weapon Damage",
};

export function heroCombatOptions(draft) {
  const hero = heroById[draft.heroId];
  if (!hero) return [];
  return hero.abilities.flatMap((ability) => {
    // These attributes belong to summons or a transformed preset, not the caster.
    if (
      ability.id === "citadel_ability_shieldedsentry" ||
      (hero.id === "hero_necro" && ability.slot === "4") ||
      ability.id === "ability_werewolf_transformation"
    )
      return [];
    const keys = new Set([
      ...ability.properties.map((p) => p.Key),
      ...ability.upgrades.flatMap((upgrade) => Object.keys(upgrade)),
    ]);
    return [...keys].flatMap((key) => {
      const original = ability.properties.find((p) => p.Key === key);
      const label =
        key === "WeaponDamageBonus"
          ? original?.unit === "%"
            ? "Weapon Damage"
            : "Flat Bullet Damage"
          : heroBuffKeys[key];
      if (!label) return [];
      const base = original || { Key: key, Name: label, Value: 0 };
      const prop = upgradedProperty(
        base,
        ability,
        abilityRank(draft, ability.slot),
      );
      // A negative fire-rate effect is an enemy slow, not a self buff.
      if (
        prop.Value < 0 ||
        prop.Scale.some(
          (scale) =>
            !["spirit", "power_increase", "healing"].includes(scale.Type),
        )
      )
        return [];
      const possible = [0, 1, 2, 3].some((rank) => {
        const value = upgradedProperty(base, ability, rank);
        return value.Value > 0 || value.Scale.some((scale) => scale.Value > 0);
      });
      if (!possible) return [];
      const stacking = /PerStack|PerHero|PerKill|PerLeech/.test(key);
      const limit = ability.properties.find((p) => p.Key === "MaxStacks");
      const max = stacking
        ? limit
          ? upgradedProperty(limit, ability, abilityRank(draft, ability.slot))
              .Value
          : 100
        : 1;
      return [
        {
          key: `hero:${ability.id}:${key}`,
          ability,
          prop,
          label,
          max: Math.max(1, max),
          scope:
            base.Title?.replace(/:$/, "") ||
            (key === "MaxBonusMoveSpeedPercent"
              ? "At full ramp"
              : "While the listed buff is active"),
        },
      ];
    });
  });
}

function buffValue(option, spirit, boons, healing) {
  let value = option.prop.Value;
  for (const scale of option.prop.Scale) {
    if (scale.Type === "spirit") value += scale.Value * spirit;
    if (scale.Type === "power_increase") value += scale.Value * boons;
  }
  for (const scale of option.prop.Scale)
    if (scale.Type === "healing") value *= 1 + (scale.Value * healing) / 100;
  return value;
}

export function combatOptions(ids) {
  return [...new Set(ids)].flatMap((id) => {
    const item = byId[id];
    if (!item) return [];
    return item.effectGroups.flatMap((effect, index) => {
      const kind = classifyEffect(item, effect);
      if (kind === "Always on") return [];
      // These apply to one cast/attack, not a standing character attribute.
      if (["Arcane Surge", "Express Shot"].includes(item.name)) return [];
      const stats = effect.stats
        .map(parseStat)
        .filter(
          (stat) =>
            stat?.known &&
            stat.scale == null &&
            (stat.value > 0 || stat.label === "Reload Time") &&
            !(
              kind === "Imbued" &&
              /Ability Range|Ability Duration|Ability Cooldown/.test(stat.label)
            ),
        )
        .map((stat) => ({
          ...stat,
          value:
            stat.label === "Reload Time" ? Math.abs(stat.value) : stat.value,
        }));
      if (!stats.length) return [];
      const max = Number(
        effect.stats.join(" ").match(/(\d+) Max Stacks/)?.[1] ||
          effect.description.match(/max of (\d+)/i)?.[1] ||
          1,
      );
      return [
        {
          key: `${id}:${index}`,
          item,
          effect,
          kind,
          stats,
          max,
          omitted: effect.stats.filter((raw) => {
            const stat = parseStat(raw);
            return stat?.known && stat.scale != null;
          }),
        },
      ];
    });
  });
}

export function combatStats(draft) {
  const settings = { ...defaultCombat, ...draft.combat };
  const transformed =
    isSilver(draft.heroId) &&
    (settings.lycan || draft.heroId === "hero_werewolf_transformed");
  const effectiveDraft = transformed
    ? { ...draft, heroId: "hero_werewolf_transformed" }
    : draft;
  const options = combatOptions(draft.equipped);
  const sources = options.flatMap((option) => {
    const count = Math.max(
      0,
      Math.min(option.max, Math.trunc(settings.effects?.[option.key] || 0)),
    );
    if (!count) return [];
    return option.stats.map((stat) => ({
      ...stat,
      value: stat.value * count,
      id: option.item.id,
      name: option.item.name,
      raw: stat.raw,
      condition: option.effect.description,
      stacks: count,
    }));
  });
  for (const source of settings.extra || []) {
    if (!statRules[source.label] || !Number.isFinite(source.value)) continue;
    const mode = statRules[source.label][2];
    const value =
      mode === "diminish"
        ? Math.max(-100, Math.min(100, source.value))
        : source.value;
    sources.push({
      label: source.label,
      value,
      name: source.name || "Additional buff",
      custom: true,
    });
  }
  // Resolve item spirit first so Lycan Curse's spirit scaling uses this scenario.
  let itemContext = characterStats(effectiveDraft, draft.equipped, sources);
  const heroOptions = heroCombatOptions(effectiveDraft);
  const selectedHero = heroOptions
    .map((option) => ({
      ...option,
      count: Math.max(
        0,
        Math.min(option.max, Math.trunc(settings.effects?.[option.key] || 0)),
      ),
    }))
    .filter((option) => option.count > 0);
  if (itemContext) {
    const addHero = (option, value) =>
      sources.push({
        label: option.label,
        value: value * option.count,
        name: `${itemContext.hero.name} · ${option.ability.name}`,
        hero: true,
        icon: option.ability.icon,
        stacks: option.count,
        condition: option.scope,
      });
    // Resolve spirit multipliers and spirit gains before other spirit-scaled buffs.
    const multipliers = selectedHero.filter(
      (option) => option.label === "Spirit power multiplier",
    );
    for (const option of multipliers)
      addHero(
        option,
        buffValue(option, itemContext.spirit, itemContext.boons, 0),
      );
    itemContext = characterStats(effectiveDraft, draft.equipped, sources);
    const spiritOptions = selectedHero.filter(
      (option) => option.label === "Spirit Power",
    );
    const flat = spiritOptions.reduce(
      (sum, option) =>
        sum + buffValue(option, 0, itemContext.boons, 0) * option.count,
      0,
    );
    const coefficient = spiritOptions.reduce(
      (sum, option) =>
        sum +
        option.prop.Scale.filter((s) => s.Type === "spirit").reduce(
          (total, s) => total + s.Value,
          0,
        ) *
          option.count,
      0,
    );
    const multiplier =
      1 + itemContext.bonus.get("Spirit power multiplier") / 100;
    const denominator = 1 - coefficient * multiplier;
    const spirit =
      denominator > 0
        ? (itemContext.spirit + flat * multiplier) / denominator
        : itemContext.spirit;
    if (denominator > 0)
      for (const option of spiritOptions)
        addHero(option, buffValue(option, spirit, itemContext.boons, 0));
    itemContext = characterStats(effectiveDraft, draft.equipped, sources);
    for (const option of selectedHero.filter(
      (option) =>
        !["Spirit Power", "Spirit power multiplier"].includes(option.label),
    ))
      addHero(
        option,
        buffValue(
          option,
          itemContext.spirit,
          itemContext.boons,
          itemContext.bonus.get("Outgoing Healing"),
        ),
      );
    itemContext = characterStats(effectiveDraft, draft.equipped, sources);
  }
  if (transformed && itemContext) {
    const ability = heroById[effectiveDraft.heroId].abilities.find(
      (a) => a.slot === "4",
    );
    const rank = abilityRank(draft, "4");
    const property = (key) => {
      const base = ability.properties.find((p) => p.Key === key);
      if (!base) return 0;
      const prop = upgradedProperty(base, ability, rank);
      return (
        prop.Value +
        prop.Scale.reduce(
          (sum, scale) =>
            sum +
            (scale.Type === "spirit"
              ? scale.Value * itemContext.spirit
              : scale.Type === "power_increase"
                ? scale.Value * boonLevel(draft)
                : 0),
          0,
        )
      );
    };
    for (const [key, label] of [
      ["BulletResist", "Bullet Resist"],
      ["TechResist", "Spirit Resist"],
      ["BonusHealth", "Bonus Health"],
      ["BonusMoveSpeed", "Move Speed"],
      ["BonusSprintSpeed", "Sprint Speed"],
      ["Stamina", "Stamina"],
    ]) {
      const value = property(key);
      if (value)
        sources.push({
          label,
          value,
          name: "Lycan Curse",
          hero: true,
          icon: ability.icon,
        });
    }
    const maxStacks = property("MaxStacks") || 15;
    const stacks = Math.max(
      0,
      Math.min(maxStacks, Math.trunc(settings.lycanStacks || 0)),
    );
    if (stacks)
      sources.push({
        label: "Fire Rate",
        value: (property("BonusFireRate") * stacks) / maxStacks,
        name: "Lycan Curse",
        hero: true,
        icon: ability.icon,
        stacks,
      });
  }
  const context = characterStats(effectiveDraft, draft.equipped, sources);
  const items = equippedStats(draft.equipped, sources);
  const standing = characterStats(draft);
  const rows = context ? [...context.stats] : [];
  // Include lifesteal, debuff resist and other bonuses absent from hero totals.
  for (const row of items.rows) {
    if (
      !rows.some((r) => r.label === row.label) &&
      (row.sources.length || row.conditional.length)
    )
      rows.push({ ...row, bonusOnly: true });
  }
  return {
    context,
    standing,
    rows,
    sources,
    items,
    options,
    heroOptions: heroOptions.map((option) => ({
      ...option,
      value: context
        ? buffValue(
            option,
            context.spirit,
            context.boons,
            context.bonus.get("Outgoing Healing"),
          )
        : 0,
    })),
    transformed,
    effectiveDraft,
  };
}
