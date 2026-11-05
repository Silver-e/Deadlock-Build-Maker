import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { zstdDecompressSync } from "node:zlib";
import protobuf from "protobufjs";
import { makeDraft, items } from "../src/model.js";
import { heroes } from "../src/heroes.js";
import ids from "../data/game-ids.json" with { type: "json" };
import { encodeGameBuild, exportGameBuild } from "../src/deadlockBuild.js";

// Decode with the source .proto and Node's native zstd, independently of the export codec.
const Build = protobuf
  .parse(
    fs.readFileSync(
      new URL("../data/hero-build.proto", import.meta.url),
      "utf8",
    ),
  )
  .root.lookupType("CMsgHeroBuild");
test("game export preserves ordered categories, optional flags, Unicode notes and uint32 item IDs", async () => {
  const d = makeDraft();
  d.heroId = "hero_atlas";
  d.name = "Abrams — تجربة";
  d.description = "Build notes";
  d.categories[0].description = "Buy first";
  d.categories[0].items = ["upgrade_clip_size", "upgrade_close_range"];
  d.equipped = ["upgrade_clip_size"];
  const before = structuredClone(d);
  const code = await exportGameBuild(d);
  const compressed = Buffer.from(code, "base64");
  assert.deepEqual([...compressed.subarray(0, 4)], [0x28, 0xb5, 0x2f, 0xfd]);
  const decoded = Build.decode(zstdDecompressSync(compressed));
  assert.equal(decoded.heroId, 6);
  assert.equal(decoded.name, d.name);
  assert.equal(decoded.description, d.description);
  assert.deepEqual(
    decoded.details.modCategories.map((c) => c.name),
    d.categories.map((c) => c.name),
  );
  assert.deepEqual(
    decoded.details.modCategories.map((c) => c.optional),
    [false, true, false, true, false, true, true],
  );
  assert.deepEqual(
    decoded.details.modCategories[0].mods.map((m) => m.abilityId),
    [1548066885, ids.items.upgrade_close_range],
  );
  assert.equal(decoded.details.modCategories[0].description, "Buy first");
  assert.equal(decoded.details.abilityOrder, null);
  assert.deepEqual(d, before);
});

test("every catalog item and normal hero has an export ID", () => {
  for (const i of items) assert.ok(ids.items[i.id], i.id);
  for (const h of heroes.filter((h) => h.id !== "hero_werewolf_transformed"))
    assert.ok(ids.heroes[h.id], h.id);
});

test("export includes explicitly assigned imbue targets", () => {
  const d = makeDraft();
  d.heroId = "hero_inferno";
  const item = items.find((i) => i.imbue);
  d.categories[0].items = [item.id];
  d.imbues[item.id] = "1";
  const decoded = Build.decode(encodeGameBuild(d));
  assert.equal(
    decoded.details.modCategories[0].mods[0].imbueTargetAbilityId,
    491391007,
  );
});

test("export requires a hero and enforces the game payload limit", () => {
  const d = makeDraft();
  assert.throws(() => encodeGameBuild(d), /Select a supported build character/);
  d.heroId = "hero_atlas";
  d.description = "x".repeat(16001);
  assert.throws(() => encodeGameBuild(d), /16 KB/);
});
