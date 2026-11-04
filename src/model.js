import snapshot from "../data/items.json" with { type: "json" };
export const items = snapshot.items;
export const byId = Object.fromEntries(items.map((i) => [i.id, i]));
export const types = ["Weapon", "Spirit", "Vitality"];
export const thresholds = [
  800, 1600, 2400, 3200, 4800, 6400, 8000, 11200, 16000, 22400, 28800,
];
export const bonuses = {
  Weapon: [9, 12, 15, 18, 46, 54, 62, 74, 86, 100, 115],
  Vitality: [9, 12, 15, 20, 38, 42, 46, 50, 54, 60, 66],
  Spirit: [7, 11, 15, 19, 38, 45, 52, 59, 66, 75, 100],
};
export function investment(ids, type) {
  const souls = [...new Set(ids)].reduce(
    (s, id) => s + (byId[id]?.type === type ? byId[id].cost : 0),
    0,
  );
  let level = -1;
  thresholds.forEach((t, i) => {
    if (souls >= t) level = i;
  });
  return {
    souls,
    bonus: level < 0 ? 0 : bonuses[type][level],
    level,
    next: thresholds[level + 1] ?? null,
  };
}
export function ancestors(id, seen = new Set()) {
  for (const c of byId[id]?.components || []) {
    if (!seen.has(c)) {
      seen.add(c);
      ancestors(c, seen);
    }
  }
  return seen;
}
export function equip(ids, id, extra = 3) {
  if (!byId[id])
    return { ids, error: "This item is not in the current catalog." };
  if (ids.includes(id)) return { ids: ids.filter((x) => x !== id) };
  if (ids.some((x) => ancestors(x).has(id)))
    return {
      ids,
      error:
        "An equipped upgrade already includes this component. Remove the upgrade first.",
    };
  const replaced = ancestors(id);
  const next = ids.filter((x) => !replaced.has(x));
  if (next.length >= 9 + extra)
    return {
      ids,
      error: "Your loadout is full. Remove an item or unlock an extra slot.",
    };
  if (byId[id].active && next.filter((x) => byId[x]?.active).length >= 4)
    return {
      ids,
      error:
        "You can equip up to four active items. Remove an active item first.",
    };
  return { ids: [...next, id] };
}
export function makeDraft() {
  return {
    id: crypto.randomUUID(),
    name: "Untitled build",
    description: "",
    heroId: null,
    boons: 0,
    abilityRanks: {},
    imbues: {},
    previewAbility: "1",
    categories: ["Early Game", "Mid Game", "Late Game", "Optional"].map(
      (name) => ({
        id: crypto.randomUUID(),
        name,
        description: "",
        items: [],
        wide: true,
        optional: name === "Optional",
      }),
    ),
    equipped: [],
    extra: 3,
  };
}
// Migrate older saves without changing category order or the equipped loadout.
export function uniqueDraftItems(draft) {
  const seen = new Set();
  return {
    ...draft,
    categories: draft.categories.map((category) => ({
      ...category,
      items: category.items.filter((id) => {
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      }),
    })),
  };
}

// Index refers to the destination before removal, as reported by a drop target.
export function moveDraftItem(draft, id, target, index) {
  const destination = draft.categories.find((c) => c.id === target);
  if (!byId[id] || !destination) return draft;
  const before = destination.items.slice(0, index ?? destination.items.length);
  const position = before.filter((value) => value !== id).length;
  return {
    ...draft,
    categories: draft.categories.map((category) => {
      const items = category.items.filter((value) => value !== id);
      if (category.id === target) items.splice(position, 0, id);
      return { ...category, items };
    }),
  };
}

export function validDraft(d) {
  return (
    d &&
    typeof d.id === "string" &&
    typeof d.name === "string" &&
    typeof d.description === "string" &&
    (d.combat === undefined ||
      (d.combat &&
        typeof d.combat === "object" &&
        !Array.isArray(d.combat) &&
        (d.combat.enabled === undefined ||
          typeof d.combat.enabled === "boolean") &&
        (d.combat.lycan === undefined || typeof d.combat.lycan === "boolean") &&
        (d.combat.lycanStacks === undefined ||
          (Number.isInteger(d.combat.lycanStacks) &&
            d.combat.lycanStacks >= 0 &&
            d.combat.lycanStacks <= 15)) &&
        (d.combat.effects === undefined ||
          (d.combat.effects &&
            typeof d.combat.effects === "object" &&
            !Array.isArray(d.combat.effects) &&
            Object.values(d.combat.effects).every(
              (v) => Number.isInteger(v) && v >= 0 && v <= 1000,
            ))) &&
        (d.combat.extra === undefined ||
          (Array.isArray(d.combat.extra) &&
            d.combat.extra.every(
              (source) =>
                source &&
                typeof source.id === "string" &&
                typeof source.name === "string" &&
                typeof source.label === "string" &&
                Number.isFinite(source.value) &&
                Math.abs(source.value) <= 100000,
            ))))) &&
    (d.heroId == null || typeof d.heroId === "string") &&
    (d.boons === undefined ||
      (Number.isInteger(d.boons) && d.boons >= 0 && d.boons <= 35)) &&
    (d.previewAbility === undefined ||
      ["1", "2", "3", "4"].includes(d.previewAbility)) &&
    (d.abilityRanks === undefined ||
      (d.abilityRanks &&
        typeof d.abilityRanks === "object" &&
        !Array.isArray(d.abilityRanks) &&
        Object.entries(d.abilityRanks).every(
          ([slot, rank]) =>
            ["1", "2", "3", "4"].includes(slot) &&
            Number.isInteger(rank) &&
            rank >= 0 &&
            rank <= 3,
        ))) &&
    (d.imbues === undefined ||
      (d.imbues &&
        typeof d.imbues === "object" &&
        !Array.isArray(d.imbues) &&
        Object.entries(d.imbues).every(
          ([id, slot]) =>
            byId[id]?.imbue && ["1", "2", "3", "4"].includes(slot),
        ))) &&
    Number.isInteger(d.extra) &&
    d.extra >= 0 &&
    d.extra <= 3 &&
    Array.isArray(d.categories) &&
    d.categories.length > 0 &&
    d.categories.every(
      (c) =>
        typeof c.id === "string" &&
        typeof c.name === "string" &&
        typeof c.description === "string" &&
        (c.optional === undefined || typeof c.optional === "boolean") &&
        Array.isArray(c.items) &&
        c.items.every((i) => byId[i]),
    ) &&
    Array.isArray(d.equipped) &&
    d.equipped.every((i) => byId[i]) &&
    new Set(d.equipped).size === d.equipped.length
  );
}
export { snapshot };
