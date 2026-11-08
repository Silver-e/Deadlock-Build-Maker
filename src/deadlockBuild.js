import protobuf from "protobufjs";
import schema from "../data/hero-build-schema.json" with { type: "json" };
import ids from "../data/game-ids.json" with { type: "json" };
import { heroById } from "./heroes.js";
import { byId, validDraft, makeDraft } from "./model.js";
import { abilityPlanSteps, validAbilityOrder } from "./abilityPlan.js";

const Build = protobuf.Root.fromJSON(schema).lookupType("CMsgHeroBuild");
export const MAX_BUILD_BYTES = 16000;

export function decodeGameBuild(bytes) {
  if (!bytes.length || bytes.length > MAX_BUILD_BYTES)
    throw Error(
      "Build data must be between 1 byte and 16 KB. Shorten the notes or remove categories in Deadlock, then copy again.",
    );
  let build;
  try {
    build = Build.decode(bytes);
  } catch {
    throw Error(
      "This is not valid Deadlock build data. Copy the build again in Deadlock and paste the complete code.",
    );
  }
  const heroId = Object.keys(ids.heroes).find(
    (id) =>
      ids.heroes[id] === build.heroId && id !== "hero_werewolf_transformed",
  );
  if (!heroById[heroId])
    throw Error(
      `This build uses an unsupported hero (game ID ${build.heroId}). Try a supported character, or report this ID so DBM can add support.`,
    );
  if (!build.details || build.version !== 0)
    throw Error(
      `This build uses an unsupported build format (version ${build.version}). Copy it again from the current game. If it still fails, report this version so DBM can be updated.`,
    );
  const draft = makeDraft({ starterItems: false });
  draft.heroId = heroId;
  draft.name = build.name || "Imported build";
  draft.description = build.description || "";
  const itemIds = new Map(
    Object.entries(ids.items).map(([id, value]) => [value, id]),
  );
  const slots = new Map(
    heroById[heroId].abilities.map((a) => [ids.abilities[a.id], a.slot]),
  );
  const seen = new Set();
  const categories = build.details.modCategories.map((category) => ({
    id: crypto.randomUUID(),
    name: category.name || "Items",
    description: category.description || "",
    optional: !!category.optional,
    wide: true,
    items: category.mods.flatMap((mod) => {
      const id = itemIds.get(mod.abilityId);
      if (!byId[id])
        throw Error(
          `This build contains an unsupported item (${mod.abilityId}). Remove or replace it in Deadlock and copy again, or report this ID so DBM can update its catalog.`,
        );
      if (mod.imbueTargetAbilityId) {
        const slot = slots.get(mod.imbueTargetAbilityId);
        if (!slot || !byId[id].imbue)
          throw Error(
            "This build contains an unsupported imbue target. Clear or reassign the imbue in Deadlock, then copy again.",
          );
        draft.imbues[id] = slot;
      }
      if (seen.has(id)) return [];
      seen.add(id);
      return [id];
    }),
  }));
  if (categories.length) draft.categories = categories;
  draft.abilityOrder = (build.details.abilityOrder?.currencyChanges || [])
    .filter((step) => step.delta < 0)
    .map((step) => {
      const slot = slots.get(step.abilityId);
      if (!slot)
        throw Error(
          "This build contains an unsupported ability order. Reset the ability order in Deadlock, then copy again.",
        );
      return slot;
    });
  if (!validAbilityOrder(draft.abilityOrder) || !validDraft(draft))
    throw Error(
      "This build contains an unsupported ability order or draft data. Reset the ability order in Deadlock and copy again. If it still fails, report the build to DBM.",
    );
  return draft;
}

export async function importGameBuild(text) {
  const code = text.trim().replace(/\s/g, "");
  if (!code || code.length > 24000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(code))
    throw Error(
      "Paste the build code copied from Deadlock, not a build ID or link.",
    );
  let bytes;
  try {
    const compressed = Uint8Array.from(atob(code), (c) => c.charCodeAt(0));
    const { Zstd } = await import("@hpcc-js/wasm-zstd");
    const zstd = await Zstd.load();
    bytes = zstd.decompress(compressed);
  } catch {
    throw Error(
      "Could not read this Deadlock build code. Copy the build again and paste the complete code.",
    );
  }
  return decodeGameBuild(bytes);
}

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
