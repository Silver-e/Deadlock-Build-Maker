import { byId } from "./model.js";
import { parseStat } from "./stats.js";

// Charge-up is not an item cooldown (deadlock.wiki/Charge-Up).
const chargeUp = new Set([
  "Mystic Burst",
  "Tankbuster",
  "Quicksilver Reload",
  "Mercurial Magnum",
]);

// Effect values use the bundled tooltip snapshot. Imbues and conditional
// bonuses are deliberately absent from the global bonus context.
export function scaledItemProperties(item, context, imbuedCooldown = 0) {
  const { get } = context.bonus;
  const properties = [];
  if (item.cooldown > 0 && !chargeUp.has(item.name)) {
    properties.push({
      Key: "cooldown",
      label: "Cooldown",
      unit: "s",
      total:
        (item.cooldown + imbuedCooldown) *
        (1 - get("Item Cooldown Reduction") / 100),
    });
  }
  for (const [i, effect] of (item.effectGroups || []).entries()) {
    for (const [j, text] of effect.stats.entries()) {
      const stat = parseStat(text);
      if (!stat) continue;
      const duration =
        /Duration$/.test(stat.label) &&
        stat.unit === "s" &&
        !/Delay|Summon|Immunity|Parry/.test(stat.label);
      const range =
        /(?:Cast Range|Teleport Range|Radius)$/.test(stat.label) &&
        (text.includes("m ") || stat.scale !== null);
      if (stat.scale === null && !duration && !range) continue;
      let total = stat.value + (stat.scale || 0) * context.spirit;
      if (duration) total *= 1 + get("Ability Duration") / 100;
      if (range) total *= 1 + get("Ability Range") / 100;
      properties.push({
        Key: `${i}:${j}`,
        label: stat.label,
        unit: range
          ? "m"
          : text.match(
              /^[+−-]?[\d.]+(?:\s*x[\d.]+)?(%|m\/s|HP\/s|m|s)?\s/,
            )?.[1] || "",
        total,
      });
    }
  }
  return properties;
}

export function equippedItemChanges(
  beforeIds,
  afterIds,
  beforeContext,
  afterContext,
  cooldownFor,
) {
  // Compare retained equipment, never an upgrade against its consumed component.
  return afterIds
    .filter((id) => beforeIds.includes(id) && byId[id])
    .map((id) => {
      const item = byId[id];
      const before = scaledItemProperties(
        item,
        beforeContext,
        cooldownFor(item, false),
      );
      const after = scaledItemProperties(
        item,
        afterContext,
        cooldownFor(item, true),
      );
      return {
        ...item,
        changes: after
          .map((prop, i) => ({
            ...prop,
            before: before[i].total,
            after: prop.total,
          }))
          .filter((prop) => Math.abs(prop.after - prop.before) > 0.00001),
      };
    })
    .filter((item) => item.changes.length);
}
