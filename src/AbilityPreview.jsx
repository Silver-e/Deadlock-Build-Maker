import { assetUrl } from "./assets.js";
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
        <img src={assetUrl(hero.portrait)} alt="" />
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
                  <img src={assetUrl(ability.icon)} alt="" />
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
          <section aria-label="Equipped item changes">
            <h4 className="equipped-changes-title">Equipped item changes</h4>
            {comparison.itemChanges.length ? (
              comparison.itemChanges.map((equipment) => (
                <div className="ability-change" key={equipment.id}>
                  <h5>
                    <img src={assetUrl(equipment.icon)} alt="" />
                    {equipment.name}
                  </h5>
                  <dl>
                    {equipment.changes.map((prop) => (
                      <div key={prop.Key}>
                        <dt>
                          <StatIcon stat={prop.label} size={14} />
                          {prop.label}
                        </dt>
                        <dd>
                          <span>
                            {statNumber(prop.before, prop.unit, false)}
                          </span>
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
                No changes to other equipped item values.
              </p>
            )}
            <p className="comparison-note">
              Retained equipment only. Item cooldown reduction is separate from
              ability cooldown reduction. Conditional bonuses, fixed delays and
              immunity timers are excluded.
            </p>
          </section>
          <p className="comparison-footnote">
            Before enemy resistance. Item effect values are shown per trigger;
            item damage procs are not added to character ability damage.
          </p>
        </>
      )}
    </section>
  );
}
