import { assetUrl } from "./assets.js";
import React from "react";
import { types } from "./model";
import { equippedStats, statNumber } from "./stats";
import StatIcon from "./StatIcon";

export default function EquippedStats({
  ids,
  onInspect,
  hasCharacter = false,
}) {
  const { rows, effects, equipped } = equippedStats(ids);
  const sourceButton = (s, key) => (
    <button
      key={key}
      className="stat-source"
      onClick={(e) => onInspect(s.id, e)}
      aria-label={`Inspect ${s.name}: ${s.raw || s.label}${s.condition ? ". " + s.condition : ""}`}
      title={`${s.name}: ${s.raw || ""}${s.condition ? " — " + s.condition : ""}`}
    >
      <img src={assetUrl(equipped.find((i) => i.id === s.id)?.icon)} alt="" />
      <span>{s.raw || statNumber(s.value, s.unit)}</span>
      {s.classification && <small>{s.classification}</small>}
    </button>
  );
  return (
    <section className="stats-page" aria-label="Equipped item stats">
      <div className="stats-title">
        <div>
          <h2>Equipped item stats</h2>
          <p>
            Permanent bonuses include your item investments. Conditional bonuses
            are shown separately with their item icon.
          </p>
        </div>
        <span>{equipped.length} equipped items</span>
      </div>
      {!equipped.length && (
        <p className="stats-empty">
          Equip items from your build or the shop to see their combined stats
          here.
        </p>
      )}
      <div className="stat-columns">
        {types.map((type) => (
          <section className={`stat-column ${type.toLowerCase()}`} key={type}>
            <h3>{type}</h3>
            {rows
              .filter((r) => r.group === type)
              .map((row) => (
                <div className="stat-row" key={row.label} data-stat={row.label}>
                  <details>
                    <summary>
                      <span className="stat-label">
                        <StatIcon stat={row.label} />
                        {row.label}
                      </span>
                      <strong>{statNumber(row.total, row.unit)}</strong>
                    </summary>
                    <div className="stat-breakdown">
                      <p>
                        {row.mode === "diminish"
                          ? "Multiplicative stacking: 1 − the product of each remaining percentage."
                          : row.mode === "multiply"
                            ? "Percentage multipliers multiply together."
                            : "Contributions add together."}
                        {row.multiplier
                          ? " Flat spirit is then multiplied by the spirit power bonus."
                          : ""}
                      </p>
                      {row.sources.length ? (
                        row.sources.map((s, i) =>
                          s.id ? (
                            sourceButton(s, i)
                          ) : (
                            <span className="investment-source" key={i}>
                              {s.name}
                              <b>{statNumber(s.value, s.unit)}</b>
                            </span>
                          ),
                        )
                      ) : (
                        <p>No permanent bonus from equipped items.</p>
                      )}
                      {row.multiplierSources?.map((s, i) =>
                        sourceButton(s, "multiplier" + i),
                      )}
                    </div>
                  </details>
                  {row.conditional.length > 0 && (
                    <div className="conditional-chips">
                      {row.conditional.map((s, i) => sourceButton(s, i))}
                    </div>
                  )}
                </div>
              ))}
          </section>
        ))}
      </div>
      <div className="stat-note">
        <strong>Item bonuses, before hero stats.</strong> Health and damage are
        bonuses to your hero’s base values.{" "}
        {hasCharacter
          ? "Character totals appear above. "
          : "Choose a character to see hero totals. "}
        Conditional chips show the item’s listed amount; per-stack and
        spirit-scaled effects retain their qualifiers.
      </div>
      {effects.length > 0 && (
        <section
          className="equipped-effects"
          aria-label="Item effects and conditions"
        >
          <h2>Item effects & conditions</h2>
          <p>
            All equipped passives, actives, imbues and target effects. Enemy
            debuffs stay here rather than reducing your own stats.
          </p>
          <div className="effect-list">
            {equipped
              .filter((i) => effects.some((e) => e.item.id === i.id))
              .map((item) => (
                <article
                  className={`equipped-effect ${item.type.toLowerCase()}`}
                  key={item.id}
                >
                  <div className="effect-item-title">
                    <button onClick={(e) => onInspect(item.id, e)}>
                      <img src={assetUrl(item.icon)} alt="" />
                      {item.name}
                    </button>
                  </div>
                  {effects
                    .filter((e) => e.item.id === item.id)
                    .map((effect, i) => (
                      <div className="effect-entry" key={i}>
                        <span className="condition-kind">
                          {effect.classification}
                        </span>
                        <p>{effect.description}</p>
                        {effect.stats.length > 0 && (
                          <ul>
                            {effect.stats.map((s, j) => (
                              <li key={j}>
                                <StatIcon stat={s} size={16} />
                                {s}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                </article>
              ))}
          </div>
        </section>
      )}
    </section>
  );
}
