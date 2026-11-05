import { test } from "node:test";
import assert from "node:assert/strict";
import protobuf from "protobufjs";
import fs from "node:fs";
import { zstdDecompressSync } from "node:zlib";
import {
  abilityPlanSteps,
  setAbilityStep,
  validAbilityOrder,
} from "../src/abilityPlan.js";
import { makeDraft, validDraft } from "../src/model.js";
import { heroes } from "../src/heroes.js";
import { exportGameBuild, encodeGameBuild } from "../src/deadlockBuild.js";
import ids from "../data/game-ids.json" with { type: "json" };
import fixture from "./fixtures/abrams-ability-order.json" with { type: "json" };

const Build = protobuf
  .parse(
    fs.readFileSync(
      new URL("../data/hero-build.proto", import.meta.url),
      "utf8",
    ),
  )
  .root.lookupType("CMsgHeroBuild");
test("ability plans track unlocks and 1/2/5 AP upgrades, including interleaved orders", () => {
  const order = ["3", "3", "1", "2", "1", "4", "3", "3"];
  assert.deepEqual(
    abilityPlanSteps(order).map((s) => s.cost),
    [0, 1, 0, 0, 1, 0, 2, 5],
  );
  const full = [
    "1",
    "2",
    "3",
    "4",
    ...Array(3).fill(["1", "2", "3", "4"]).flat(),
  ];
  assert.ok(validAbilityOrder(full));
  assert.equal(
    abilityPlanSteps(full).reduce((sum, s) => sum + s.cost, 0),
    32,
  );
  for (const bad of [
    null,
    {},
    ["0"],
    [1],
    ["1", "1", "1", "1", "1"],
    [...full, "1"],
  ])
    assert.equal(validAbilityOrder(bad), false);
});

test("editing recomputes unlocks and upgrades without gaps or overfilling an ability", () => {
  const order = ["1", "1", "1", "1", "2"];
  assert.deepEqual(setAbilityStep(order, 4, "1"), ["2", "1", "1", "1", "1"]);
  assert.equal(setAbilityStep(order, 5, "1"), order);
  assert.equal(setAbilityStep(order, 6, "3"), order);
  const next = setAbilityStep(order, 0, "3");
  assert.deepEqual(next, ["3", "1", "1", "1", "2"]);
  assert.equal(abilityPlanSteps(next)[1].unlock, true);
  assert.deepEqual(order, ["1", "1", "1", "1", "2"]);
});

test("legacy drafts remain valid and plans survive serialization without altering preview ranks", () => {
  const d = makeDraft();
  delete d.abilityOrder;
  assert.ok(validDraft(d));
  d.abilityOrder = ["2", "2", "1", "4"];
  const loaded = JSON.parse(JSON.stringify(d));
  assert.ok(validDraft(loaded));
  assert.deepEqual(loaded.abilityOrder, d.abilityOrder);
  assert.deepEqual(loaded.abilityRanks, {});
  d.abilityOrder = ["2", "2", "2", "2", "2"];
  assert.equal(validDraft(d), false);
});

test("exported ability spending matches a native Abrams build fixture byte fields exactly", async () => {
  const d = makeDraft();
  d.heroId = "hero_atlas";
  d.abilityOrder = [
    "3",
    "3",
    "1",
    "2",
    "2",
    "1",
    "4",
    "4",
    "1",
    "1",
    "2",
    "4",
    "4",
    "2",
    "3",
    "3",
  ];
  const decoded = Build.decode(
    zstdDecompressSync(Buffer.from(await exportGameBuild(d), "base64")),
  );
  assert.deepEqual(
    decoded.details.abilityOrder.currencyChanges.map((c) => ({
      ability_id: c.abilityId,
      currency_type: c.currencyType,
      delta: c.delta,
    })),
    fixture.currencyChanges.map(({ annotation, ...c }) => c),
  );
});

test("each selectable hero can export a full ability order using its four canonical ability IDs", () => {
  for (const hero of heroes) {
    const d = makeDraft();
    d.heroId = hero.id;
    d.abilityOrder = [
      "1",
      "2",
      "3",
      "4",
      ...Array(3).fill(["1", "2", "3", "4"]).flat(),
    ];
    const decoded = Build.decode(encodeGameBuild(d));
    assert.equal(
      decoded.details.abilityOrder.currencyChanges.length,
      16,
      hero.id,
    );
    const canonical =
      hero.id === "hero_werewolf_transformed"
        ? heroes.find((h) => h.id === "hero_werewolf")
        : hero;
    assert.deepEqual(
      decoded.details.abilityOrder.currencyChanges
        .slice(0, 4)
        .map((c) => c.abilityId),
      canonical.abilities.map((a) => ids.abilities[a.id]),
    );
  }
});
