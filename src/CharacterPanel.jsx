import { assetUrl } from "./assets.js";
import React from "react";
import { heroes, heroById, boonLevel, imbueTarget } from "./heroes";
import { byId } from "./model";

export default function CharacterPanel({ draft, onChange }) {
  const hero = heroById[draft.heroId];
  const imbuables = draft.equipped
    .map((id) => byId[id])
    .filter((i) => i?.imbue);
  return (
    <section
      className={`character-panel ${hero ? "has-character" : ""}`}
      aria-label="Character setup"
    >
      <div className="character-toolbar">
        {hero && (
          <img
            className="character-portrait"
            src={assetUrl(hero.portrait)}
            alt=""
          />
        )}
        <label className="character-select">
          Character
          <select
            aria-label="Build character"
            value={hero?.id || ""}
            onChange={(e) => {
              const next = {
                ...draft,
                heroId: e.target.value || null,
                abilityRanks: {},
                abilityOrder: [],
                imbues: {},
              };
              next.imbues = Object.fromEntries(
                imbuables
                  .map((item) => [item.id, imbueTarget(next, item)])
                  .filter(([, slot]) => slot),
              );
              onChange({
                heroId: next.heroId,
                abilityRanks: {},
                abilityOrder: [],
                imbues: next.imbues,
              });
            }}
          >
            <option value="">Choose a character</option>
            {heroes.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
                {h.preview ? " (Preview)" : ""}
              </option>
            ))}
          </select>
        </label>
        {hero ? (
          <>
            <label className="boon-select">
              Boons
              <select
                aria-label="Character boon level"
                value={boonLevel(draft)}
                onChange={(e) => onChange({ boons: Number(e.target.value) })}
              >
                {Array.from({ length: 36 }, (_, i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </label>
            <label className="preview-target">
              New item imbue preview
              <select
                aria-label="Item preview imbue target"
                value={draft.previewAbility || "1"}
                onChange={(e) => onChange({ previewAbility: e.target.value })}
              >
                {hero.abilities.map((a) => (
                  <option key={a.slot} value={a.slot}>
                    {a.slot}. {a.name}
                  </option>
                ))}
              </select>
            </label>
            <span className="character-context">
              Stats use your equipped loadout.
            </span>
          </>
        ) : (
          <p>
            Give this draft a character to see their stats and item-by-item
            ability changes.
          </p>
        )}
      </div>
    </section>
  );
}
