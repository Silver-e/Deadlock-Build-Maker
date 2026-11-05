import protobuf from "protobufjs";
import schema from "../data/hero-build-schema.json" with { type: "json" };
import ids from "../data/game-ids.json" with { type: "json" };
import { heroById } from "./heroes.js";
import { byId, validDraft } from "./model.js";
import { abilityPlanSteps } from "./abilityPlan.js";

const Build = protobuf.Root.fromJSON(schema).lookupType("CMsgHeroBuild");
export const MAX_BUILD_BYTES = 16000;

export function encodeGameBuild(draft, now = Date.now()) {
  if (!validDraft(draft))
    throw Error(
      "This draft is invalid. Reload a saved draft before exporting.",
    );
  const hero = heroById[draft.heroId];
  const heroId =
    ids.heroes[
      draft.heroId === "hero_werewolf_transformed"
        ? "hero_werewolf"
        : draft.heroId
    ];
  if (!hero || !heroId)
    throw Error(
      "Select a supported build character before copying for Deadlock.",
    );
  const categories = draft.categories.map((category) => ({
    name: category.name,
    description: category.description || "",
    optional: !!category.optional,
    mods: category.items.map((id) => {
      const abilityId = ids.items[id];
      if (!abilityId)
        throw Error(
          `Cannot export ${byId[id]?.name || id}: its game ID is missing.`,
        );
      const mod = { abilityId };
      const target = draft.imbues?.[id];
      if (target && byId[id]?.imbue) {
        const ability = hero.abilities.find((a) => a.slot === target);
        const targetId = ids.abilities[ability?.id];
        if (!targetId)
          throw Error(
            `Cannot export the imbue target for ${byId[id].name}. Select a supported character form or clear this imbue.`,
          );
        mod.imbueTargetAbilityId = targetId;
      }
      return mod;
    }),
  }));
  const details = { modCategories: categories };
  if (draft.abilityOrder?.length) {
    // Silver's alternate form previews the same hero and upgrade slots.
    const planHero =
      draft.heroId === "hero_werewolf_transformed"
        ? heroById.hero_werewolf
        : hero;
    details.abilityOrder = {
      currencyChanges: abilityPlanSteps(draft.abilityOrder).map((step) => {
        const ability = planHero.abilities.find((a) => a.slot === step.slot);
        const abilityId = ids.abilities[ability?.id];
        if (!abilityId)
          throw Error(
            `Cannot export the ability order: ${ability?.name || step.slot} has no game ID.`,
          );
        return {
          abilityId,
          currencyType: step.unlock ? 2 : 1,
          delta: step.unlock ? -1 : -step.cost,
        };
      }),
    };
  }
  const build = {
    heroBuildId: 1,
    heroId,
    lastUpdatedTimestamp: Math.floor(now / 1000),
    name: draft.name,
    description: draft.description || "",
    version: 0,
    details,
  };
  const error = Build.verify(build);
  if (error) throw Error(`Could not export this build: ${error}`);
  const bytes = Build.encode(Build.create(build)).finish();
  if (bytes.length > MAX_BUILD_BYTES)
    throw Error(
      "This build exceeds Deadlock’s 16 KB limit. Shorten its descriptions or remove some categories.",
    );
  return bytes;
}

export async function exportGameBuild(draft) {
  const bytes = encodeGameBuild(draft);
  const { Zstd } = await import("@hpcc-js/wasm-zstd");
  const zstd = await Zstd.load();
  const compressed = zstd.compress(bytes, 3);
  return btoa(String.fromCharCode(...compressed));
}
