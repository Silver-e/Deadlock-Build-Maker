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

// Native compression and the source proto exercise the game-facing import boundary.
test("imports game clipboard builds as independent drafts", async () => {
  const { zstdCompressSync } = await import("node:zlib");
  const { importGameBuild } = await import("../src/deadlockBuild.js");
  const source = makeDraft();
  source.heroId = "hero_inferno";
  source.name = "Imported notes";
  source.description = "Build description";
  const item = items.find((i) => i.imbue);
  source.categories[0].items = [item.id];
  source.categories[0].description = "Buy first";
  source.imbues[item.id] = "1";
  source.abilityOrder = ["1", "2", "1", "3", "4"];
  const code = zstdCompressSync(encodeGameBuild(source)).toString("base64");
  const draft = await importGameBuild(`  ${code}\n`);
  assert.notEqual(draft.id, source.id);
  assert.equal(draft.heroId, source.heroId);
  assert.equal(draft.name, source.name);
  assert.equal(draft.description, source.description);
  assert.deepEqual(draft.abilityOrder, source.abilityOrder);
  assert.deepEqual(draft.imbues, source.imbues);
  assert.deepEqual(draft.equipped, []);
  assert.deepEqual(
    draft.categories.map(({ id, ...c }) => c),
    source.categories.map(({ id, ...c }) => c),
  );
});

test("import rejects invalid, unsupported and oversized builds", async () => {
  const { decodeGameBuild, importGameBuild } =
    await import("../src/deadlockBuild.js");
  for (const code of [
    "",
    "1234",
    "https://example.com/build/1",
    "A".repeat(24001),
  ])
    await assert.rejects(importGameBuild(code));
  assert.throws(() => decodeGameBuild(new Uint8Array(16001)), /16 KB/);
  assert.throws(() => decodeGameBuild(Uint8Array.of(255)), /not valid/);
  const encode = (build) => Build.encode(Build.create(build)).finish();
  assert.throws(
    () => decodeGameBuild(encode({ heroId: 9999, details: {} })),
    /unsupported hero/,
  );
  assert.throws(
    () =>
      decodeGameBuild(
        encode({
          heroId: 6,
          details: { modCategories: [{ mods: [{ abilityId: 1 }] }] },
        }),
      ),
    /unsupported item/,
  );
});
