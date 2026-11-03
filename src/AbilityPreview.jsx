import React from "react";
import { byId } from "./model";
import { heroById, itemComparison, boonLevel } from "./heroes";
import { statNumber } from "./stats";
import StatIcon from "./StatIcon";

export default function AbilityPreview({ draft, item }) {
  const hero = heroById[draft?.heroId];
  if (!hero)
    return (
      <p className="ability-preview-empty">
        Choose a character to preview ability changes.
      </p>
    );
  const comparison = itemComparison(draft, item);
  if (!comparison) return null;
  const target = hero.abilities.find((a) => a.slot === comparison.target);
  return (
    <section
      className="ability-preview"
      aria-label={`${hero.name} ability changes`}
    >
      <div className="ability-preview-title">
        <img src={hero.portrait} alt="" />
        <div>
          <h4>{hero.name} · Ability changes</h4>
          <small>{boonLevel(draft)} boons · selected ability upgrades</small>
        </div>
      </div>
      {comparison.blocked ? (
        <p>{comparison.blocked}</p>
      ) : (
        <>
          <p className="comparison-caption">
            {comparison.equipped
              ? "Without this item → Equipped loadout"
              : "Equipped loadout → With this item"}
          </p>
          {comparison.replaced?.length > 0 && (
            <p className="comparison-note">
              Replaces{" "}
              {comparison.replaced.map((id) => byId[id].name).join(", ")}.
            </p>
          )}
          {comparison.hypothetical && (
            <p className="comparison-note">
              Hypothetical: free a loadout slot before equipping.
            </p>
          )}
          {target && (
            <p className="comparison-note">
              <span className="imbue-text">IMBUE</span> {target.name}
              {!comparison.equipped ? " · using your preview target" : ""}
            </p>
          )}
          {comparison.abilities.length ? (
            comparison.abilities.map((ability) => (
              <div className="ability-change" key={ability.id}>
                <h5>
                  <img src={ability.icon} alt="" />
                  {ability.name}
                  <small>{ability.rank ? `T${ability.rank}` : "Base"}</small>
                </h5>
                <dl>
                  {ability.changes.map((prop) => (
                    <div key={prop.Key}>
                      <dt>
                        <StatIcon stat={prop.Name} size={14} property={prop} />
                        {prop.label}
                      </dt>
                      <dd>
                        <span>{statNumber(prop.before, prop.unit, false)}</span>
                        <span aria-hidden="true">→</span>
                        <strong>
                          {statNumber(prop.after, prop.unit, false)}
                        </strong>
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))
          ) : (
            <p className="comparison-note">
              No change to this character’s ability values at these upgrades.
              Item effects are listed above.
            </p>
          )}
          <p className="comparison-footnote">
            Before enemy resistance. Triggered bonuses and item damage procs are
            excluded.
          </p>
        </>
      )}
    </section>
  );
}
