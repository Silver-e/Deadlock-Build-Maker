import React from "react";
import { characterStats, abilityStats } from "./heroes";
import { types } from "./model";
import { statNumber } from "./stats";
import StatIcon from "./StatIcon";

export default function CharacterStats({ draft }) {
  const totals = characterStats(draft);
  if (!totals) return null;
  const abilities = abilityStats(draft);
  return (
    <section className="character-stats" aria-label="Character stats">
      <div className="stats-title">
        <div>
          <h2>{totals.hero.name} · Character stats</h2>
          <p>
            Hero base stats + {totals.boons} boons + equipped item bonuses.
            Assigned imbues apply to the abilities below.
          </p>
        </div>
        <img src={totals.hero.portrait} alt="" />
      </div>
      <div className="stat-columns">
        {types.map((type) => (
          <section className={`stat-column ${type.toLowerCase()}`} key={type}>
            <h3>{type}</h3>
            {totals.stats
              .filter((r) => r.group === type)
              .map((r) => (
                <div
                  className="hero-stat"
                  key={r.label}
                  title={r.note}
                  data-hero-stat={r.label}
                >
                  <span>
                    <StatIcon stat={r.label} />
                    {r.label}
                  </span>
                  <strong>{statNumber(r.total, r.unit, false)}</strong>
                </div>
              ))}
          </section>
        ))}
      </div>
      <div className="character-abilities">
        <h2>Abilities with this loadout</h2>
        <p>
          Damage is before enemy resistance. Conditional buffs, stacks, targets
          and temporary item effects are not assumed active.
        </p>
        {abilities.map((a) => (
          <details className="character-ability" key={a.id}>
            <summary>
              <img src={a.icon} alt="" />
              <span>
                {a.name}
                <small>
                  {a.passive
                    ? "Passive"
                    : a.slot === "4"
                      ? "Ultimate"
                      : `Ability ${a.slot}`}
                </small>
              </span>
              <strong>{a.rank ? `Tier ${a.rank}` : "Base"}</strong>
            </summary>
            <div className="character-ability-body">
              {a.descriptions.map((s, i) => (
                <p key={i}>{s}</p>
              ))}
              <dl>
                {a.properties.map((p) => (
                  <div key={p.Key}>
                    <dt>
                      <StatIcon stat={p.Name} property={p} />
                      {p.label}
                    </dt>
                    <dd>{statNumber(p.total, p.unit, false)}</dd>
                  </div>
                ))}
              </dl>
              {a.rank > 0 && (
                <ul className="ability-upgrade-notes">
                  {a.upgradeDescriptions.slice(0, a.rank).map(
                    (desc, i) =>
                      desc && (
                        <li key={i}>
                          Tier {i + 1}: {desc}
                        </li>
                      ),
                  )}
                </ul>
              )}
            </div>
          </details>
        ))}
      </div>
      <p className="stat-note">
        Character totals use innate stats and equipment. Combat-dependent hero
        passives and ability-granted buffs are shown in the abilities; they are
        not added to the standing character totals.
      </p>
    </section>
  );
}
