import { test } from "node:test";
import assert from "node:assert/strict";
import { heroes } from "../src/heroes.js";
import { makeDraft, byId, validDraft } from "../src/model.js";
import { validAbilityOrder } from "../src/abilityPlan.js";
import {
  recommendationsFor,
  addRecommendations,
} from "../src/recommendations.js";

test("every character has sourced, catalog-valid recommendations and valid verified plans", () => {
  for (const hero of heroes) {
    const entry = recommendationsFor(hero.id);
    assert.ok(entry, hero.name);
    assert.ok(entry.profiles.length >= 2);
    for (const profile of entry.profiles) {
      assert.ok(
        profile.sources.every(
          (source) => new URL(source.url).protocol === "https:",
        ),
      );
      assert.ok(profile.stages.length);
      assert.ok(
        profile.stages.every((stage) => stage.items.every((id) => byId[id])),
      );
      assert.ok(
        validAbilityOrder(profile.abilityOrder),
        `${hero.name}: ${profile.name}`,
      );
    }
  }
  assert.deepEqual(
    recommendationsFor("hero_werewolf_transformed"),
    recommendationsFor("hero_werewolf"),
  );
  assert.equal(recommendationsFor(null), null);
});

test("distinct guide styles retain their own purchases and ability sequences", () => {
  const ivy = recommendationsFor("hero_tengu").profiles;
  const spirit = ivy.find((p) => p.id === "spirit-guide");
  const support = ivy.find((p) => p.id === "support-guide");
  assert.notDeepEqual(spirit.stages, support.stages);
  assert.equal(spirit.abilityOrder.length, 0);
  assert.equal(support.abilityOrder.length, 16);
  assert.ok(
    recommendationsFor("hero_warden").profiles.find(
      (p) => p.id === "spirit-guide",
    ),
  );
});

test("recommendations append missing items once and preserve the existing draft", () => {
  const draft = makeDraft();
  draft.heroId = "hero_warden";
  const profile = recommendationsFor(draft.heroId).profiles[0];
  const id = profile.stages[0].items[0];
  draft.categories[0].items = [id];
  draft.equipped = [id];
  draft.abilityOrder = ["1"];
  const before = structuredClone(draft);
  const next = addRecommendations(draft, profile);
  assert.deepEqual(draft, before);
  assert.deepEqual(
    next.categories.slice(0, draft.categories.length),
    draft.categories,
  );
  assert.deepEqual(next.equipped, draft.equipped);
  assert.deepEqual(next.abilityOrder, draft.abilityOrder);
  assert.deepEqual(next.imbues, draft.imbues);
  assert.ok(validDraft(next));
  const ids = next.categories.flatMap((c) => c.items);
  assert.equal(ids.length, new Set(ids).size);
  assert.deepEqual(addRecommendations(next, profile), next);
  const single = addRecommendations(makeDraft(), profile, id);
  assert.deepEqual(
    single.categories
      .filter((c) => c.name.startsWith("Recommended"))
      .flatMap((c) => c.items),
    [id],
  );
});
