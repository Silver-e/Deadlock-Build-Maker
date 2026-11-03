import fs from "node:fs/promises";
import { load } from "cheerio";
const root = new URL("../", import.meta.url);
await fs.mkdir(new URL("public/items/", root), { recursive: true });
await fs.mkdir(new URL("data/", root), { recursive: true });
const get = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw Error(`${r.status} ${url}`);
  return r;
};
const raw = await (
  await get("https://deadlock.wiki/Data:ItemData.json?action=raw")
).json();
const index = load(await (await get("https://deadlock.wiki/Items")).text());
const names = new Map();
index(".item-link-wrapper").each((_, el) => {
  const a = index(el).find("a").last();
  const name = index(el).attr("data-item-name");
  if (name && !names.has(name)) names.set(name, a.attr("href"));
});
const items = Object.entries(raw).filter(
  ([, v]) =>
    v.Name &&
    !v.IsDisabled &&
    !v.StreetBrawl &&
    v.Cost > 0 &&
    v.Tier <= 4 &&
    names.has(v.Name),
);
const clean = (s) => s.replace(/\s+/g, " ").trim();
const result = [];
let next = 0;
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (next < items.length) {
      const [id, v] = items[next++];
      const url = "https://deadlock.wiki" + names.get(v.Name);
      const $ = load(await (await get(url)).text());
      const box = $(".item-infobox").first();
      box.find("style,script").remove();
      const icon = box.find(".infobox-image img").first().attr("src");
      if (!icon) throw Error("Missing icon " + v.Name);
      await fs.writeFile(
        new URL(`public/items/${id}.png`, root),
        Buffer.from(await (await get(icon)).arrayBuffer()),
      );
      const stats = box
        .find(".infobox-stat")
        .map((_, e) => clean($(e).text()))
        .get()
        .filter(Boolean);
      const effectGroups = [];
      let group = null;
      box.find("td,th").each((_, el) => {
        const cell = $(el),
          cls = cell.attr("class") || "";
        if (/(?:active|passive)-header/.test(cls)) {
          group = {
            kind: cls.includes("active-header") ? "Active" : "Passive",
            heading: clean(cell.text()),
            description: "",
            stats: [],
          };
          effectGroups.push(group);
        }
        if (/(?:active|passive)-description/.test(cls)) {
          if (!group) {
            group = {
              kind: "Passive",
              heading: "Passive",
              description: "",
              stats: [],
            };
            effectGroups.push(group);
          }
          group.description = clean(cell.text());
        }
        if (/(?:active|passive)-stat-container/.test(cls) && group) {
          cell.find(".active-stat, .passive-stat").each((_, stat) => {
            const copy = $(stat).clone();
            copy.find("br").replaceWith(" ");
            copy.find(".stat-attr").append(" ");
            const value = clean(copy.text());
            if (value) group.stats.push(value);
          });
        }
      });
      box.find("br").replaceWith(" ");
      box.find(".stat-attr").append(" ");
      box.find(".passive-stat, .active-stat").append(" · ");
      const effects = box
        .find(".passive-stat-container, .active-stat-container")
        .map((_, e) => clean($(e).text()))
        .get()
        .filter(Boolean);
      const description = box
        .find(".passive-description, .active-description")
        .map((_, e) => clean($(e).text()))
        .get()
        .filter(Boolean)
        .join("\n\n");
      result.push({
        id,
        name: v.Name,
        cost: v.Cost,
        tier: v.Tier,
        type: { Tech: "Spirit", Armor: "Vitality" }[v.Slot] || v.Slot,
        active: box.find(".active-header").length > 0,
        imbue: !!v.IsImbue,
        cooldown: v.AbilityCooldown || 0,
        components: v.Components || [],
        stats,
        effects,
        effectGroups: effectGroups.filter(
          (g) => g.description || g.stats.length,
        ),
        description,
        source: url,
        icon: `/items/${id}.png`,
        iconSource: icon,
      });
      console.log(result.length + "/" + items.length, v.Name);
    }
  }),
);
result.sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));
await fs.writeFile(
  new URL("data/items.json", root),
  JSON.stringify(
    {
      source: "https://deadlock.wiki/Items",
      retrieved: new Date().toISOString(),
      items: result,
    },
    null,
    2,
  ),
);
console.log("Snapshot saved: " + result.length + " items.");
await import('./sync-stat-icons.mjs');
