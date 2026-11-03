import fs from "node:fs/promises";
import { load } from "cheerio";

const root = new URL("../", import.meta.url);
const get = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw Error(`${response.status} ${url}`);
  return response;
};
const read = async (name) =>
  (await get(`https://deadlock.wiki/Data:${name}.json?action=raw`)).json();
const [raw, cards, abilities, lang] = await Promise.all(
  ["HeroData", "AbilityCards", "AbilityData", "Lang_en"].map(read),
);
await fs.mkdir(new URL("public/heroes/", root), { recursive: true });
await fs.mkdir(new URL("public/abilities/", root), { recursive: true });
await fs.mkdir(new URL("public/stat-icons/", root), { recursive: true });
const statDownloads = new Map();
const original = (url) =>
  url
    .replace("/thumb/", "/")
    .replace(/\/[^/]+$/, (last) => (/^\/\d+px-/.test(last) ? "" : last));
const clean = (s) => s.replace(/\s+/g, " ").trim();
const units = Object.fromEntries(
  Object.entries(lang)
    .filter(([k]) => k.endsWith("_postfix"))
    .map(([k, v]) => [k.slice(0, -8), v]),
);
const roster = Object.entries(raw).filter(
  ([id, h]) =>
    h.Name &&
    h.IsSelectable &&
    !h.IsDisabled &&
    ["1", "2", "3", "4"].every((n) => cards[id]?.[n]?.Name),
);
const heroes = [];
let cursor = 0;
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (cursor < roster.length) {
      const [id, h] = roster[cursor++];
      const name = h.Name.replace(" (Transformed)", "");
      const source = `https://deadlock.wiki/${encodeURIComponent(name.replaceAll(" ", "_"))}`;
      const $ = load(await (await get(source)).text());
      const filename = `${name.replaceAll(" ", "_")}.png`;
      const portrait = $("img")
        .map((_, e) => $(e).attr("src"))
        .get()
        .find((url) => decodeURIComponent(url).split("/").includes(filename));
      if (!portrait) throw Error(`Missing head portrait: ${h.Name}`);
      const portraitSource = original(portrait);
      await fs.writeFile(
        new URL(`public/heroes/${id}.png`, root),
        Buffer.from(await (await get(portraitSource)).arrayBuffer()),
      );
      const slots = [];
      for (const slot of ["1", "2", "3", "4"]) {
        const card = cards[id][slot];
        const node = $(".ability-card")
          .filter((_, e) => clean($(e).find(".ac-name").text()) === card.Name)
          .first();
        const image = node.find(".ac-icon img").attr("src");
        if (!image) throw Error(`Missing ability art: ${h.Name}: ${card.Name}`);
        const iconSource = original(image);
        const icon = `/abilities/${id}-${slot}.png`;
        await fs.writeFile(
          new URL(`public${icon}`, root),
          Buffer.from(await (await get(iconSource)).arrayBuffer()),
        );
        const desc = node
          .find(".ac-info-desc")
          .map((_, e) => {
            const copy = $(e).clone();
            copy.find("br").replaceWith(" ");
            return clean(copy.text());
          })
          .get()
          .filter(Boolean);
        const properties = new Map();
        function collect(value) {
          if (!value || typeof value !== "object") return;
          if (value.Name && value.Value !== undefined) return;
          for (const [key, v] of Object.entries(value)) {
            if (
              v &&
              typeof v === "object" &&
              v.Name &&
              v.Value !== undefined &&
              !v.Hidden
            ) {
              const propKey = v.Key || key;
              properties.set(propKey, {
                ...v,
                Key: propKey,
                unit: units[propKey] || "",
              });
            } else collect(v);
          }
        }
        collect(card);
        const props = [...properties.values()];
        for (const prop of props) {
          const attr = node
            .find(".ability-attr")
            .filter((_, e) => $(e).attr("id") === prop.Key)
            .first();
          prop.unit =
            clean(attr.next("span").text()) ||
            prop.unit ||
            (prop.Type === "duration" ? "s" : "");
          const container = attr.closest(
            ".ac-mainbox-value, .ac-altbox-inner, .ability-headerattr",
          );
          const image = container.find("img").first();
          if (image.attr("src")) {
            const statSource = original(image.attr("src"));
            const file = decodeURIComponent(
              new URL(statSource).pathname.split("/").pop(),
            );
            prop.statIcon = `/stat-icons/${file.replace(/[^\w.-]/g, "_")}`;
            prop.statIconSource = statSource;
            const styles = image
              .parentsUntil(container)
              .map((_, e) => $(e).attr("style") || "")
              .get()
              .join(";");
            prop.statFilter =
              styles.match(/filter:\s*([^;]+)/)?.[1]?.trim() || "none";
            if (!statDownloads.has(prop.statIcon)) {
              const local = new URL(`public${prop.statIcon}`, root);
              statDownloads.set(
                prop.statIcon,
                fs
                  .access(local)
                  .catch(async () =>
                    fs.writeFile(
                      local,
                      Buffer.from(await (await get(statSource)).arrayBuffer()),
                    ),
                  ),
              );
            }
          }
        }
        // A negative cooldown is the source's sentinel for a passive / unavailable metric.
        const passive = !props.some(
          (p) => p.Key === "AbilityCooldown" && Number(p.Value) > 0,
        );
        slots.push({
          slot,
          id: card.Key,
          name: card.Name,
          icon,
          iconSource,
          descriptions: desc,
          passive,
          properties: props,
          upgrades: card.Upgrades || [],
          upgradeDescriptions: (card.Upgrades || []).map(
            (u, index) =>
              clean(node.find(".ac-upgrade-desc").eq(index).text()) ||
              clean(load(`<div>${lang[u.DescKey] || ""}</div>`).text()).replace(
                /\{[^}]+\}/g,
                "",
              ),
          ),
          behavior: abilities[card.Key]?.BehaviourBits || [],
        });
      }
      heroes.push({
        id,
        name: h.Name,
        preview: !!h.InDevelopment,
        portrait: `/heroes/${id}.png`,
        portraitSource,
        source,
        base: Object.fromEntries(
          Object.entries(h).filter(([, v]) => typeof v === "number"),
        ),
        level: h.LevelScaling || {},
        spirit: h.SpiritScaling || {},
        weapon: h.Weapon,
        abilities: slots,
      });
      console.log(`${h.Name}: ${slots.length} abilities`);
    }
  }),
);
heroes.sort((a, b) => a.name.localeCompare(b.name));
await Promise.all(statDownloads.values());
await fs.writeFile(
  new URL("data/heroes.json", root),
  JSON.stringify(
    {
      source: "https://deadlock.wiki/Heroes",
      fetched: new Date().toISOString(),
      heroes,
    },
    null,
    2,
  ) + "\n",
);
console.log(`Saved ${heroes.length} heroes and their local artwork.`);
