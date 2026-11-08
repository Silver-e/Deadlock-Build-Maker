import snapshot from "../data/recommendations.json" with { type: "json" };
import guides from "../data/recommendation-guides.json" with { type: "json" };
import { byId, items } from "./model.js";

export const researchedAt = snapshot.researchedAt;
const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const names = new Map(items.map((item) => [normalize(item.name), item.id]));
export function recommendationsFor(heroId) {
  const canonical =
    heroId === "hero_werewolf_transformed" ? "hero_werewolf" : heroId;
  const entry = snapshot.heroes.find((hero) => hero.heroId === canonical);
  if (!entry) return null;
  const curated = guides
    .filter((guide) => guide.heroId === canonical)
    .map((guide) => {
      const omitted = [];
      return {
        ...guide,
        stages: guide.stages.map((stage) => ({
          ...stage,
          items: stage.items.flatMap((name) => {
            const id = names.get(normalize(name));
            if (!id) omitted.push(name);
            return id ? [id] : [];
          }),
        })),
        omitted,
      };
    });
  return { ...entry, profiles: [...entry.profiles, ...curated] };
}

// Append only items missing everywhere in the draft. Never move an existing item
// or alter equipment, category notes, imbues or the ability plan as a side effect.
export function addRecommendations(draft, profile, onlyId) {
  const seen = new Set(draft.categories.flatMap((category) => category.items));
  const categories = [...draft.categories];
  for (const stage of profile.stages) {
    const added = stage.items.filter(
      (id) =>
        byId[id] && (!onlyId || id === onlyId) && !seen.has(id) && seen.add(id),
    );
    if (!added.length) continue;
    const name = `Recommended · ${stage.name}`;
    const index = categories.findIndex((category) => category.name === name);
    if (index >= 0)
      categories[index] = {
        ...categories[index],
        items: [...categories[index].items, ...added],
      };
    else
      categories.push({
        id: crypto.randomUUID(),
        name,
        description: profile.name,
        optional: false,
        wide: true,
        items: added,
      });
  }
  return { ...draft, categories };
}
