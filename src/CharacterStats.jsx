import { assetUrl } from "./assets.js";
import React from "react";
import { characterStats, abilityStats } from "./heroes";
import { types } from "./model";
import { statNumber } from "./stats";
import StatIcon from "./StatIcon";
import CombatControls from "./CombatControls";
import { combatStats } from "./combat";

const sourceLabels = (label) =>
  ({
    "Bullet Damage": ["Flat Bullet Damage", "Weapon Damage"],
    "Weapon DPS": ["Flat Bullet Damage", "Weapon Damage", "Fire Rate"],
    "Light Melee Damage": ["Weapon Damage", "Melee Damage"],
    "Heavy Melee Damage": ["Weapon Damage", "Melee Damage"],
    "Max Health": ["Bonus Health", "Health bonus", "Max Health"],
    "Spirit Power": ["Spirit Power", "Spirit power multiplier"],
    "Move Speed": ["Move Speed", "Move Speed bonus"],
    "Sprint Speed": ["Move Speed", "Move Speed bonus", "Sprint Speed"],
    "Stamina Recovery": ["Stamina Recovery", "Stamina Regeneration"],
  })[label] || [label];

export default function CharacterStats({
  draft,
  onCombatChange,
  onRankChange,
}) {
  const scenario = draft.combat?.enabled ? combatStats(draft) : null;
  const totals = scenario ? scenario.context : characterStats(draft);
  if (!totals) return null;
  const abilities = abilityStats(
    scenario?.effectiveDraft || draft,
    draft.equipped,
    scenario?.sources || [],
  );
  const rows = scenario?.rows || totals.stats;
  return (
    <section className="character-stats" aria-label="Character stats">
      <div className="stats-title">
        <div>
          <h2>
            {totals.hero.name} ·{" "}
            {scenario ? "Combined stats" : "Character stats"}
          </h2>
          <p>
            Hero base stats + {totals.boons} boons + equipped item bonuses
            {scenario ? " + selected combat effects" : ""}. Assigned imbues
            apply to the abilities below.
          </p>
        </div>
        <img src={assetUrl(totals.hero.portrait)} alt="" />
      </div>
      <div
        className="stat-view-switch"
        role="group"
        aria-label="Stats calculation"
      >
        <button
          aria-pressed={!scenario}
          onClick={() => onCombatChange({ enabled: false })}
        >
          Standing stats
        </button>
        <button
          aria-pressed={!!scenario}
          onClick={() => onCombatChange({ enabled: true })}
        >
          Combined stats
        </button>
      </div>
      {scenario && (
        <CombatControls
          draft={draft}
          scenario={scenario}
          onChange={onCombatChange}
          onRankChange={onRankChange}
        />
      )}
      <div className="stat-columns">
        {types.map((type) => (
          <section className={`stat-column ${type.toLowerCase()}`} key={type}>
            <h3>{type}</h3>
            {rows
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
                  <strong>
                    {statNumber(r.total, r.unit, false)}
                    {scenario && (
                      <small className="standing-value">
                        Standing:{" "}
                        {statNumber(
                          scenario.standing.stats.find(
                            (s) => s.label === r.label,
                          )?.total ?? scenario.standing.bonus.get(r.label),
                          r.unit,
                          false,
                        )}
                      </small>
                    )}
                  </strong>
                </div>
              ))}
          </section>
        ))}
      </div>
      {scenario && (
        <details className="combined-breakdown">
          <summary>Combined stat sources and stacking rules</summary>
          <p>
            Resistance: 100 × (1 − the product of each remaining damage
            fraction). Resistance reductions combine separately and subtract
            from the result. Cooldown and duration use diminishing stacking;
            weapon damage and fire rate add. Repeated stacks from one buff form
            one source.
          </p>
          {rows
            .filter(
              (row) =>
                sourceLabels(row.label).some(
                  (label) => scenario.context.bonus.rows[label]?.sources.length,
                ) || ["Bullet Resist", "Spirit Resist"].includes(row.label),
            )
            .map((row) => {
              const sources = sourceLabels(row.label).flatMap(
                (label) => scenario.context.bonus.rows[label]?.sources || [],
              );
              return (
                <div className="combined-source-row" key={row.label}>
                  <h4>
                    {row.label} · {statNumber(row.total, row.unit, false)}
                    {row.bonusOnly ? " bonus" : ""}
                  </h4>
                  <ul>
                    {!row.bonusOnly && (
                      <li>
                        {totals.hero.name} base stats and {totals.boons} boons
                        {row.label === "Spirit Power"
                          ? ", then spirit multipliers"
                          : ""}
                      </li>
                    )}
                    {sources.map((source, index) => (
                      <li key={index}>
                        {source.name}:{" "}
                        {statNumber(source.value, source.unit ?? row.unit)}{" "}
                        {source.label}
                        {source.stacks > 1 ? ` (${source.stacks} stacks)` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
        </details>
      )}
      <div className="character-abilities">
        <h2>Abilities with this loadout</h2>
        <p>
          Damage is before enemy resistance.{" "}
          {scenario
            ? "Includes the selected combat effects and assigned imbues."
            : "Conditional buffs, stacks, targets and temporary item effects are not assumed active."}
        </p>
        {abilities.map((a) => (
          <details className="character-ability" key={a.id}>
            <summary>
              <img src={assetUrl(a.icon)} alt="" />
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
        {scenario ? (
          "Combined totals include only the conditions you selected. Standing values show the same draft without these combat effects."
        ) : (
          <>
            Character totals use innate stats and equipment. Combat-dependent
            hero passives and ability-granted buffs are shown in the abilities;
            they are not added to the standing character totals.
          </>
        )}
      </p>
    </section>
  );
}
