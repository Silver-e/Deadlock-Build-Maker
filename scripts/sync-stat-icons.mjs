import fs from "node:fs/promises";
import { load } from "cheerio";
const root = new URL("../", import.meta.url);
const snapshot = JSON.parse(
  await fs.readFile(new URL("data/items.json", root), "utf8"),
);
const raw = await (
  await fetch("https://deadlock.wiki/Data:ItemData.json?action=raw")
).json();
const byRaw = {},
  byLabel = {},
  byRawFilter = {},
  byLabelFilter = {},
  sources = {};
const clean = (s) => s.replace(/\s+/g, " ").trim();
const labelOf = (s) =>
  s.replace(
    /^[+−-]?\d[\d.,]*(?:\s*x[+−-]?\d[\d.,]*)?(?:%|m\/s|HP\/s|m|s|\/s)?\s+/,
    "",
  );
function register(url) {
  const name = decodeURIComponent(
    new URL(url).pathname.match(/\/thumb\/([^/]+)\//)?.[1] ||
      new URL(url).pathname.split("/").pop(),
  );
  const local = "/stat-icons/" + name.replace(/[^\w.-]/g, "_");
  sources[local] = "https://cdn.deadlock.wiki/" + encodeURIComponent(name);
  return local;
}
let next = 0;
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (next < snapshot.items.length) {
      const item = snapshot.items[next++];
      item.imbue = !!raw[item.id]?.IsImbue;
      const $ = load(await (await fetch(item.source)).text()),
        box = $(".item-infobox").first();
      box.find("style,script").remove();
      box.find(".infobox-stat,.active-stat,.passive-stat").each((_, e) => {
        const node = $(e).clone();
        node.find(".ss-wrapper,.ss-compact").remove();
        const image = node.find("img").first().attr("src");
        if (!image) return;
        const iconStyle = node
          .find("img")
          .first()
          .parentsUntil(node)
          .map((_, p) => $(p).attr("style") || "")
          .get()
          .join(";");
        const filter =
          iconStyle.match(/filter:\s*([^;]+)/)?.[1]?.trim() || "none";
        const links = node
          .find("a[title]")
          .map((_, a) => $(a).attr("title"))
          .get();
        node.find("br").replaceWith(" ");
        node.find(".stat-attr").append(" ");
        const text = clean(node.text());
        const local = register(image);
        byRaw[text] = local;
        byLabel[labelOf(text)] = local;
        byRawFilter[text] = filter;
        byLabelFilter[labelOf(text)] = filter;
        for (const title of links)
          if (!/^File:/.test(title) && !byLabel[title]) {
            byLabel[title] = local;
            byLabelFilter[title] = filter;
          }
      });
    }
  }),
);
const native = [
  "AttributeIconBulletLifesteal",
  "AttributeIconBulletSpeed",
  "AttributeIconClipSize",
  "AttributeIconFireRate",
  "AttributeIconMaxChargesIncrease",
  "AttributeIconReloadTime",
  "AttributeIconSpiritLifesteal",
  "AttributeIconTechCooldown",
  "AttributeIconTechCooldownBetweenChargeUses",
  "AttributeIconTechDuration",
  "AttributeIconTechRange",
  "Cooldown_Icon",
  "Spirit_scaling",
  "Melee_damage_light",
  "Melee_Armor",
  "Debuff_resist",
  "Stamina",
  "Stamina_recharge",
];
for (const name of native)
  register("https://cdn.deadlock.wiki/" + name + ".png");
await fs.mkdir(new URL("public/stat-icons/", root), { recursive: true });
let done = 0;
const entries = Object.entries(sources);
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (done < entries.length) {
      const [local, url] = entries[done++];
      const response = await fetch(url);
      if (!response.ok) throw Error(url + ": " + response.status);
      await fs.writeFile(
        new URL("public" + local, root),
        Buffer.from(await response.arrayBuffer()),
      );
    }
  }),
);
await fs.writeFile(
  new URL("data/stat-icons.json", root),
  JSON.stringify(
    {
      source:
        "Deadlock Wiki default item tooltips and original game attribute icons",
      retrieved: new Date().toISOString(),
      byRaw,
      byLabel,
      byRawFilter,
      byLabelFilter,
      sources,
    },
    null,
    2,
  ),
);
await fs.writeFile(
  new URL("data/items.json", root),
  JSON.stringify(snapshot, null, 2),
);
console.log(
  entries.length +
    " original stat icons downloaded; " +
    Object.keys(byLabel).length +
    " labels mapped.",
);
console.log(JSON.stringify(byLabel, null, 2));
