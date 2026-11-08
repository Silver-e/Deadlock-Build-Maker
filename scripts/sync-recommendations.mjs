import fs from "node:fs/promises";
import { load } from "cheerio";
import { heroes } from "../src/heroes.js";
import { items } from "../src/model.js";
import { validAbilityOrder } from "../src/abilityPlan.js";

// Only factual item IDs, stage assignments and ability slots are retained.
// No source prose or HTML is bundled. Re-run and review after catalog refreshes.
const get = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw Error(`${response.status}: ${url}`);
  return load(await response.text());
};
const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const catalog = new Map(items.map((item) => [normalize(item.name), item]));
const defaults = await get("https://deadlock.gs/builds/");
const index = await get("https://chudlock.com/builds/");
const results = [];
const roster = heroes.filter((hero) => hero.id !== "hero_werewolf_transformed");
let cursor = 0;
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (cursor < roster.length) {
      const hero = roster[cursor++];
      const name = hero.name.replace(" (Normal)", "");
      const card = index(".builds-card")
        .filter((_, e) => index(e).find(".builds-card-name").text() === name)
        .first();
      if (!card.length) throw Error(`Missing stats for ${name}`);
      const url = `https://chudlock.com${card.attr("href")}`;
      const stats = await get(url);
      const row = defaults("[data-row]")
        .filter((_, e) => defaults(e).attr("data-n") === name)
        .first();
      if (!row.length) throw Error(`Missing default for ${name}`);
      const sourceUrl = `https://deadlock.gs/builds/#${row.attr("id")}`;
      const omitted = new Set();
      const itemId = (name) => {
        const item = catalog.get(normalize(name));
        if (!item) omitted.add(name);
        return item?.id;
      };
      const stages = [];
      row.find(".k").each((_, e) => {
        const name = defaults(e).text().trim();
        if (!["Early Game", "Mid Game", "Late Game"].includes(name)) return;
        const ids = defaults(e)
          .parent()
          .find('a[href^="/items/"]')
          .map((_, a) => itemId(defaults(a).attr("title").split(" · ")[0]))
          .get();
        stages.push({ name, items: [...new Set(ids)] });
      });
      if (!stages.length) throw Error(`No default purchase stages for ${name}`);
      const order = row
        .find('a[href^="/abilities/"]')
        .map((_, a) => {
          const clone = defaults(a).clone();
          clone.find("span").remove();
          return (
            hero.abilities.find(
              (ability) => normalize(ability.name) === normalize(clone.text()),
            )?.slot || "?"
          );
        })
        .get();
      const baseline = {
        id: "default",
        name: "Game default",
        description:
          "Game-file purchase stages and ability plan, as indexed by deadlock.gs. A starting point to compare with observed purchases.",
        sources: [{ title: "Game-file build · deadlock.gs", url: sourceUrl }],
        stages,
        abilityOrder:
          validAbilityOrder(order) && order.length === 16 ? order : [],
        omitted: [...omitted],
      };
      omitted.clear();
      const phases = new Map();
      stats("table")
        .filter((_, t) =>
          stats(t)
            .find("caption")
            .text()
            .includes("most bought items by phase"),
        )
        .find("tbody tr")
        .each((_, tr) => {
          const cells = stats(tr)
            .find("td")
            .map((_, td) => stats(td).text())
            .get();
          const phase = cells[0];
          const id = itemId(cells[1]);
          if (!phases.has(phase)) phases.set(phase, []);
          if (id) phases.get(phase).push(id);
        });
      if (!phases.size) throw Error(`No purchase phases for ${name}`);
      const observedStages = [...phases].map(([phase, items], i) => ({
        name: ["Early Game", "Mid Game", "Late Game", "Luxury"][i] || phase,
        items: [...new Set(items)],
        timing: phase,
      }));
      const focus = card.find(".split-kind").text().trim();
      const common = [
        ...new Set(observedStages.flatMap((s) => s.items)),
      ].filter((id) => stages.some((s) => s.items.includes(id)));
      results.push({
        heroId: hero.id,
        wiki: hero.source,
        comparison: {
          common,
          note: "Shared items appear in both the game default and observed purchase phases. Differences can reflect playstyle, matchups or changes since the default was authored. Popular purchases are not causal evidence of strength.",
        },
        profiles: [
          {
            id: "observed",
            name: `Observed purchases · ${focus}`,
            description:
              "Common purchases by game phase, not one player's complete build. Choose a coherent path and adapt defensive items to the match. No ability sequence is inferred from item popularity.",
            sources: [
              { title: "Observed purchases · Chudlock", url },
              { title: "Compare game default · deadlock.gs", url: sourceUrl },
            ],
            stages: observedStages,
            abilityOrder: [],
            omitted: [...omitted],
          },
          baseline,
        ],
      });
      console.log(
        name,
        stages.flatMap((s) => s.items).length,
        baseline.abilityOrder.length,
        observedStages.flatMap((s) => s.items).length,
      );
    }
  }),
);
await fs.writeFile(
  new URL("../data/recommendations.json", import.meta.url),
  JSON.stringify(
    {
      researchedAt: new Date().toISOString().slice(0, 10),
      heroes: results.sort((a, b) => a.heroId.localeCompare(b.heroId)),
    },
    null,
    2,
  ) + "\n",
);
