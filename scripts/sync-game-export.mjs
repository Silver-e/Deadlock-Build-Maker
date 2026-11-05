import fs from "node:fs/promises";
import protobuf from "protobufjs";

const root = new URL("../", import.meta.url);
const metadata =
  "https://raw.githubusercontent.com/leamare/deadlock-metadata/main/";
const read = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw Error(`${response.status}: ${url}`);
  return response;
};
const [heroNames, itemNames, abilityNames] = await Promise.all(
  ["heroes/names.json", "items/names.json", "heroes/abilities_names.json"].map(
    async (p) => (await read(metadata + p)).json(),
  ),
);
const { heroes } = JSON.parse(
  await fs.readFile(new URL("data/heroes.json", root)),
);
const { items } = JSON.parse(
  await fs.readFile(new URL("data/items.json", root)),
);
const ids = {
  source: "https://github.com/leamare/deadlock-metadata",
  retrieved: new Date().toISOString(),
  heroes: {},
  items: {},
  abilities: {},
};
for (const hero of heroes) {
  const entry = Object.entries(heroNames).find(
    ([, v]) => `hero_${v.tag}` === hero.id || v.english === hero.name,
  );
  if (entry) ids.heroes[hero.id] = Number(entry[0]);
  else if (hero.id !== "hero_werewolf_transformed")
    throw Error(`Missing hero ID: ${hero.id}`);
  for (const ability of hero.abilities) {
    const exact = Object.entries(abilityNames).find(
      ([, v]) =>
        v.tag === ability.id || v.tag === ability.id.replace(/^citadel_/, ""),
    );
    const matches = Object.entries(abilityNames).filter(
      ([, v]) => v.english === ability.name,
    );
    const match = exact || (matches.length === 1 && matches[0]);
    if (match) ids.abilities[ability.id] = Number(match[0]);
    else
      console.warn(
        `Missing ability ID (assigned imbue export will be blocked): ${ability.id}`,
      );
  }
}
for (const item of items) {
  const entry = Object.entries(itemNames).find(([, v]) => v.tag === item.id);
  if (!entry) throw Error(`Missing item ID: ${item.id}`);
  ids.items[item.id] = Number(entry[0]);
}
const source =
  "https://raw.githubusercontent.com/SteamDatabase/Protobufs/master/deadlock/citadel_gcmessages_common.proto";
const original = await (await read(source)).text();
const start = original.indexOf("message CMsgHeroBuild {");
const end = original.indexOf("message CMsgHeroBuildPreference", start);
if (start < 0 || end < 0) throw Error("Hero build schema was not found.");
const schema =
  `// Source: ${source}\n// Snapshot: ${ids.retrieved}\nsyntax = "proto2";\n` +
  original
    .slice(start, end)
    .replace(/^\s*option .*;\n/gm, "")
    .replace(/ \[boxed_type = "[^"]+"\]/g, "");
const json = protobuf.parse(schema).root.toJSON();
await fs.writeFile(
  new URL("data/game-ids.json", root),
  JSON.stringify(ids, null, 2) + "\n",
);
await fs.writeFile(new URL("data/hero-build.proto", root), schema);
await fs.writeFile(
  new URL("data/hero-build-schema.json", root),
  JSON.stringify(json, null, 2) + "\n",
);
console.log(`Updated game export schema and IDs for ${items.length} items.`);
