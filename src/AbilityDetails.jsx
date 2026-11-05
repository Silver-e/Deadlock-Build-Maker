import React from "react";
import { assetUrl } from "./assets.js";
import { baseAbilityStats, heroById, canImbue, imbueTarget } from "./heroes.js";
import { byId } from "./model.js";
import { statNumber } from "./stats.js";
import StatIcon from "./StatIcon";
import "./ability-details.css";

export default function AbilityDetails({ draft, onChange }) {
  const hero = heroById[draft.heroId];
  if (!hero) return null;
  const abilities = baseAbilityStats(draft);
  const imbuables = draft.equipped
    .map((id) => byId[id])
    .filter((item) => item?.imbue);
  return (
    <section
      className="ability-details"
      aria-labelledby="ability-details-title"
    >
      <h2 id="ability-details-title">Ability upgrades & imbues</h2>
      <p className="ability-details-note">
        Default ability values at the selected upgrade tier, without items,
        boons, imbues, or combat conditions. See Loadout & stats for calculated
        values. Preview ranks do not change your planned ability point order.
      </p>
      {imbuables.length > 0 && (
        <div className="imbue-assignments">
          <h3>Equipped imbues</h3>
          {imbuables.map((item) => (
            <label key={item.id}>
              <img src={assetUrl(item.icon)} alt="" />
              <span>{item.name}</span>
              <select
                aria-label={`${item.name} imbue target`}
                value={imbueTarget(draft, item) || ""}
                onChange={(e) =>
                  onChange({
                    imbues: { ...draft.imbues, [item.id]: e.target.value },
                  })
                }
              >
                {hero.abilities
                  .filter((a) => canImbue(item, a))
                  .map((a) => (
                    <option key={a.slot} value={a.slot}>
                      {a.name}
                    </option>
                  ))}
              </select>
            </label>
          ))}
        </div>
      )}
      {abilities.map((ability) => (
        <article
          className="ability-detail"
          key={ability.id}
          aria-label={ability.name}
        >
          <header className="ability-detail-header">
            <img src={assetUrl(ability.icon)} alt="" />
            <div>
              <h3>
                {ability.slot}. {ability.name}
              </h3>
              <p>
                {ability.passive
                  ? "Passive"
                  : ability.slot === "4"
                    ? "Ultimate"
                    : "Active ability"}
              </p>
            </div>
            <label>
              Preview rank
              <select
                aria-label={`${ability.name} upgrade`}
                value={ability.rank}
                onChange={(e) =>
                  onChange({
                    abilityRanks: {
                      ...draft.abilityRanks,
                      [ability.slot]: Number(e.target.value),
                    },
                  })
                }
              >
                <option value={0}>Base</option>
                <option value={1}>Tier 1</option>
                <option value={2}>Tier 2</option>
                <option value={3}>Tier 3</option>
              </select>
            </label>
          </header>
          <div className="ability-detail-content">
            <div className="character-ability-body">
              {ability.descriptions.map((text, i) => (
                <p key={i}>{text}</p>
              ))}
              <dl>
                {ability.properties.map((prop) => (
                  <div key={prop.Key} data-ability-property={prop.Key}>
                    <dt>
                      <StatIcon stat={prop.Name} property={prop} />
                      {prop.label}
                    </dt>
                    <dd>{statNumber(prop.total, prop.unit, false)}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="ability-detail-upgrades">
              <h4>Upgrades</h4>
              <ol>
                {[1, 2, 3].map((tier, i) => (
                  <li key={tier} data-active={ability.rank >= tier}>
                    <div>
                      <strong>Tier {tier}</strong>
                      <span>
                        {[1, 2, 5][i]} AP
                        {ability.rank >= tier ? " · Applied" : ""}
                      </span>
                    </div>
                    <p>
                      {ability.upgradeDescriptions[i] ||
                        "No upgrade description in the current game snapshot."}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
