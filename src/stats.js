import { byId, investment } from "./model.js";

// The wiki's range/duration formula is diminishing, like resist and cooldown.
// Flat spirit is summed first, then percentage spirit multiplies the whole sum.
export const statRules = {
  "Weapon Damage": ["Weapon", "%", "sum"],
  "Flat Bullet Damage": ["Weapon", "", "sum"],
  "Fire Rate": ["Weapon", "%", "sum"],
  "Max Ammo": ["Weapon", "%", "sum"],
  "Bullet Velocity": ["Weapon", "%", "sum"],
  "Melee Damage": ["Weapon", "%", "sum"],
  "Weapon Fall-off Range": ["Weapon", "%", "sum"],
  "Weapon Zoom": ["Weapon", "%", "sum"],
  "Heavy Melee Distance": ["Weapon", "%", "sum"],
  "Reload Time": ["Weapon", "%", "diminish"],
  "Bullet Resist": ["Vitality", "%", "diminish"],
  "Spirit Resist": ["Vitality", "%", "diminish"],
  "Melee Resist": ["Vitality", "%", "diminish"],
  "Debuff Resist": ["Vitality", "%", "diminish"],
  "Slow Resist": ["Vitality", "%", "diminish"],
  "Bullet Lifesteal": ["Vitality", "%", "diminish"],
  "Spirit Lifesteal": ["Vitality", "%", "diminish"],
  "Melee Lifesteal": ["Vitality", "%", "diminish"],
  "Bonus Health": ["Vitality", "", "sum"],
  "Health bonus": ["Vitality", "%", "sum"],
  "Max Health": ["Vitality", "%", "multiply"],
  "Health Regen": ["Vitality", "/s", "sum"],
  "Out of Combat Regen": ["Vitality", "/s", "sum"],
  "Move Speed": ["Vitality", "m/s", "sum"],
  "Move Speed bonus": ["Vitality", "%", "sum"],
  "Sprint Speed": ["Vitality", "m/s", "sum"],
  Stamina: ["Vitality", "", "sum"],
  "Stamina Recovery": ["Vitality", "%", "diminish"],
  "Stamina Regeneration": ["Vitality", "%", "sum"],
  "Slide Distance": ["Vitality", "%", "sum"],
  "Air Jump/Dash Distance": ["Vitality", "%", "sum"],
  "Outgoing Healing": ["Vitality", "%", "sum"],
  "Parry Cooldown": ["Vitality", "s", "sum"],
  "Spirit Power": ["Spirit", "", "sum"],
  "Spirit power multiplier": ["Spirit", "%", "multiply"],
  "Ability Range": ["Spirit", "%", "diminish"],
  "Ability Duration": ["Spirit", "%", "diminish"],
  "Ability Cooldown Reduction": ["Spirit", "%", "diminish"],
  "Item Cooldown Reduction": ["Spirit", "%", "diminish"],
  "Bonus Ability Charges": ["Spirit", "", "sum"],
  "Charged ability spirit power": ["Spirit", "", "sum"],
  "Cooldown Reduction For Charged Abilities": ["Spirit", "%", "diminish"],
  "Ultimate Cooldown Reduction": ["Spirit", "%", "diminish"],
  "Faster Time Between Charges": ["Spirit", "%", "diminish"],
};
const aliases = {
  "Base Health": "Health bonus",
  "Bonus Spirit Power for Charged Abilities": "Charged ability spirit power",
  "Spirit Power Steal": "Spirit Power",
  "Spirit Resist Steal": "Spirit Resist",
  "Max Weapon Damage": "Weapon Damage",
  "Weapon Damage per Stack": "Weapon Damage",
  "Fire Rate per Kill": "Fire Rate",
  "Fire Rate Bonus": "Fire Rate",
  "Ambush Weapon Damage": "Weapon Damage",
  "Ambush Spirit Power": "Spirit Power",
};
const always = new Set([
  "Debuff Reducer",
  "Enduring Speed",
  "Healing Booster",
  "Greater Expansion",
  "Superior Cooldown",
  "Superior Duration",
  "Transcendent Cooldown",
  "Heroic Aura",
]);
export function parseStat(text) {
  const m = text.match(
    /^([+−-]?\d+(?:\.\d+)?)(?:\s*x([+−-]?\d+(?:\.\d+)?))?(%|m\/s|HP\/s|m|s)?\s+(.+)$/i,
  );
  if (!m) return null;
  let label = aliases[m[4]] || m[4];
  if (label === "Spirit Power" && m[3] === "%")
    label = "Spirit power multiplier";
  const rule = statRules[label];
  return {
    label,
    value: Number(m[1].replace("−", "-")),
    unit: rule?.[1] ?? (m[3] === "m" ? "m/s" : m[3] || ""),
    group:
      rule?.[0] ??
      (/Spirit|Ability|Gravity|Air Control/.test(label)
        ? "Spirit"
        : /Health|Regen|Resist|Stamina|Speed|Distance|Healing/.test(label)
          ? "Vitality"
          : "Weapon"),
    mode: rule?.[2] || "sum",
    scale: m[2] ? Number(m[2]) : null,
    known: !!rule,
    raw: text,
  };
}
export function combine(values, mode = "sum") {
  if (mode === "diminish")
    return 100 * (1 - values.reduce((p, v) => p * (1 - v / 100), 1));
  if (mode === "multiply")
    return 100 * (values.reduce((p, v) => p * (1 + v / 100), 1) - 1);
  return values.reduce((s, v) => s + v, 0);
}
export function combineStat(label, values) {
  // Shred combines separately, then subtracts percentage points from resistance.
  if (["Bullet Resist", "Spirit Resist", "Melee Resist"].includes(label))
    return (
      combine(
        values.filter((v) => v >= 0),
        "diminish",
      ) -
      combine(
        values.filter((v) => v < 0).map((v) => -v),
        "diminish",
      )
    );
  return combine(values, statRules[label]?.[2] || "sum");
}
export function classifyEffect(item, effect) {
  if (effect.kind === "Passive" && always.has(item.name)) return "Always on";
  if (effect.kind === "Active") return "Active";
  if (/imbu/i.test(effect.description)) return "Imbued";
  if (
    /stack|per kill|each hero kill/i.test(
      effect.description + " " + effect.stats.join(" "),
    )
  )
    return "Stacking";
  if (/nearby friendly|aura/i.test(effect.description)) return "Aura";
  if (
    !effect.stats.length &&
    !/when|while|after|next|upon|dealing|damage from/i.test(effect.description)
  )
    return "Passive";
  return "Conditional";
}
export function equippedStats(ids, additionalSources = []) {
  const equipped = [...new Set(ids)].map((id) => byId[id]).filter(Boolean),
    rows = new Map(),
    effects = [];
  const ensure = (s) => {
    if (!rows.has(s.label))
      rows.set(s.label, { ...s, sources: [], conditional: [], total: 0 });
    return rows.get(s.label);
  };
  const add = (s, source) => ensure(s).sources.push({ ...s, ...source });
  for (const label of [
    "Weapon Damage",
    "Fire Rate",
    "Max Ammo",
    "Bullet Resist",
    "Spirit Resist",
    "Bonus Health",
    "Bullet Lifesteal",
    "Spirit Lifesteal",
    "Spirit Power",
    "Ability Range",
    "Ability Duration",
    "Ability Cooldown Reduction",
  ]) {
    const [group, unit, mode] = statRules[label];
    ensure({ label, group, unit, mode });
  }
  for (const [type, label] of [
    ["Weapon", "Weapon Damage"],
    ["Vitality", "Health bonus"],
    ["Spirit", "Spirit Power"],
  ]) {
    const [group, unit, mode] = statRules[label];
    const value = investment(ids, type).bonus;
    if (value)
      add(
        { label, group, unit, mode, value },
        { id: null, name: `${type} investment` },
      );
  }
  for (const item of equipped) {
    const restricted = [];
    for (const raw of item.stats) {
      const s = parseStat(raw);
      if (!s) continue;
      if (/vs\.? NPCs|[Oo]n Spirit Damage/.test(raw)) {
        restricted.push(raw);
        continue;
      }
      add(s, { id: item.id, name: item.name });
    }
    if (restricted.length)
      effects.push({
        item,
        kind: "Scoped",
        classification: "Conditional",
        description:
          "Applies only to the targets or trigger stated in each stat.",
        stats: restricted,
      });
    for (const effect of item.effectGroups || []) {
      const classification = classifyEffect(item, effect);
      effects.push({ ...effect, item, classification });
      for (const raw of effect.stats) {
        const s = parseStat(raw);
        if (!s || !s.known) continue;
        if (classification === "Always on") {
          add(s, { id: item.id, name: item.name });
          continue;
        }
        // Enemy debuffs belong to the item-effect list, never to our resistance totals.
        if (s.value < 0 && s.label !== "Reload Time") continue;
        ensure(s).conditional.push({
          ...s,
          id: item.id,
          name: item.name,
          condition: effect.description,
          classification,
        });
      }
    }
  }
  for (const source of additionalSources) {
    const rule = statRules[source.label];
    if (!rule || !Number.isFinite(source.value)) continue;
    add({ group: rule[0], unit: rule[1], mode: rule[2], ...source }, source);
  }
  for (const row of rows.values())
    row.total = combineStat(
      row.label,
      row.sources.map((s) => s.value),
    );
  const spirit = rows.get("Spirit Power"),
    multiplier = rows.get("Spirit power multiplier");
  if (multiplier) {
    spirit.total *= 1 + multiplier.total / 100;
    spirit.multiplier = multiplier.total;
    spirit.multiplierSources = multiplier.sources;
  }
  return { rows: [...rows.values()], effects, equipped };
}
export function statNumber(value, unit = "", signed = true) {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return `${signed && rounded > 0 ? "+" : ""}${Object.is(rounded, -0) ? 0 : rounded.toLocaleString("en-US", { maximumFractionDigits: 2 })}${unit}`;
}
