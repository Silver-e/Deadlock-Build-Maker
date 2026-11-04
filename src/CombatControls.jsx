import React from "react";
import { assetUrl } from "./assets.js";
import { defaultCombat, isSilver } from "./combat";
import { statRules, statNumber } from "./stats";
import { abilityRank } from "./heroes";

export default function CombatControls({
  draft,
  scenario,
  onChange,
  onRankChange,
}) {
  const settings = { ...defaultCombat, ...draft.combat };
  const effects = settings.effects || {};
  const extra = settings.extra || [];
  const updateExtra = (id, fields) =>
    onChange({
      extra: extra.map((source) =>
        source.id === id ? { ...source, ...fields } : source,
      ),
    });
  return (
    <section className="combat-controls" aria-label="Combat scenario">
      <h3>Combat effects</h3>
      <p>
        Choose the effects active at the same time. Each selected condition is
        an assumption for this snapshot.
      </p>
      <h3>Character buffs</h3>
      {!scenario.heroOptions.length && !isSilver(draft.heroId) && (
        <p>
          This character has no modeled character stat buffs in the bundled
          data. Ability damage and other scoped effects remain in the abilities
          below; other stat buffs can be entered as additional sources.
        </p>
      )}
      {scenario.effectiveDraft &&
        [
          ...new Set(scenario.heroOptions.map((option) => option.ability.id)),
        ].map((id) => {
          const options = scenario.heroOptions.filter(
            (option) => option.ability.id === id,
          );
          const ability = options[0].ability;
          return (
            <details className="hero-buff-options" key={id}>
              <summary>
                <img src={assetUrl(ability.icon)} alt="" />
                {ability.name}
                <small>
                  {options.filter((option) => effects[option.key]).length}{" "}
                  selected
                </small>
              </summary>
              <p>{ability.descriptions.join(" ")}</p>
              <label>
                {ability.name} buff tier
                <select
                  aria-label={`${ability.name} buff tier`}
                  value={abilityRank(draft, ability.slot)}
                  onChange={(event) =>
                    onRankChange(Number(event.target.value), ability.slot)
                  }
                >
                  <option value="0">Base</option>
                  <option value="1">Tier 1</option>
                  <option value="2">Tier 2</option>
                  <option value="3">Tier 3</option>
                </select>
              </label>
              <label className="combat-toggle">
                <input
                  type="checkbox"
                  checked={options.every((option) => effects[option.key] > 0)}
                  onChange={(event) =>
                    onChange({
                      effects: {
                        ...effects,
                        ...Object.fromEntries(
                          options.map((option) => [
                            option.key,
                            event.target.checked ? effects[option.key] || 1 : 0,
                          ]),
                        ),
                      },
                    })
                  }
                />
                Apply listed buffs from {ability.name}
              </label>
              {options.map((option) => (
                <div className="hero-buff-option" key={option.key}>
                  {option.max === 1 ? (
                    <label className="combat-toggle">
                      <input
                        type="checkbox"
                        checked={!!effects[option.key]}
                        onChange={(event) =>
                          onChange({
                            effects: {
                              ...effects,
                              [option.key]: event.target.checked ? 1 : 0,
                            },
                          })
                        }
                      />
                      {ability.name}: {option.label}
                    </label>
                  ) : (
                    <label>
                      {ability.name}: {option.label} stacks
                      <input
                        type="number"
                        min="0"
                        max={option.max}
                        value={effects[option.key] || 0}
                        onChange={(event) =>
                          onChange({
                            effects: {
                              ...effects,
                              [option.key]: Math.max(
                                0,
                                Math.min(
                                  option.max,
                                  Math.trunc(Number(event.target.value)),
                                ),
                              ),
                            },
                          })
                        }
                      />
                    </label>
                  )}
                  <span>
                    {statNumber(option.value, statRules[option.label]?.[1])}
                    {option.max > 1 ? " per stack" : ""} · {option.scope}
                  </span>
                </div>
              ))}
              <p>
                Only apply this buff while its condition is met. Damage,
                targeted lifesteal and other ability only effects stay in the
                ability breakdown.
              </p>
            </details>
          );
        })}
      {isSilver(draft.heroId) && (
        <fieldset className="lycan-controls">
          <legend>Silver · Lycan Curse</legend>
          <label className="combat-toggle">
            <input
              type="checkbox"
              checked={scenario.transformed}
              disabled={draft.heroId === "hero_werewolf_transformed"}
              onChange={(event) => onChange({ lycan: event.target.checked })}
            />
            Lycan Curse active
          </label>
          <label>
            Lycan Curse tier
            <select
              aria-label="Lycan Curse tier"
              value={abilityRank(draft, "4")}
              onChange={(event) => onRankChange(Number(event.target.value))}
            >
              <option value="0">Base · no resistance bonus</option>
              <option value="1">Tier 1 · +15% bullet and spirit resist</option>
              <option value="2">Tier 2 · extra health and move speed</option>
              <option value="3">Tier 3 · duration refresh on kill</option>
            </select>
          </label>
          <label>
            Lycan Curse fire rate stacks
            <input
              aria-label="Lycan Curse fire rate stacks"
              type="number"
              min="0"
              max="15"
              step="1"
              value={settings.lycanStacks}
              disabled={!scenario.transformed}
              onChange={(event) =>
                onChange({
                  lycanStacks: Math.max(
                    0,
                    Math.min(15, Math.trunc(Number(event.target.value))),
                  ),
                })
              }
            />
          </label>
          <p>
            Uses transformed weapons and abilities, plus health and movement
            bonuses. Resistance starts at tier 1. Fire rate is scaled by your
            chosen stacks, out of 15.
          </p>
        </fieldset>
      )}
      <h3>Item buffs</h3>
      {scenario.options.length ? (
        <div className="combat-effect-list">
          {scenario.options.map((option) => (
            <div className="combat-effect" key={option.key}>
              <div className="combat-effect-heading">
                <img src={assetUrl(option.item.icon)} alt="" />
                {option.max === 1 ? (
                  <label className="combat-toggle">
                    <input
                      type="checkbox"
                      checked={!!effects[option.key]}
                      onChange={(event) =>
                        onChange({
                          effects: {
                            ...effects,
                            [option.key]: event.target.checked ? 1 : 0,
                          },
                        })
                      }
                    />
                    {option.item.name} · {option.kind.toLowerCase()}
                  </label>
                ) : (
                  <label>
                    {option.item.name} stacks
                    <input
                      aria-label={`${option.item.name} stacks`}
                      type="number"
                      min="0"
                      max={option.max}
                      step="1"
                      value={effects[option.key] || 0}
                      onChange={(event) =>
                        onChange({
                          effects: {
                            ...effects,
                            [option.key]: Math.max(
                              0,
                              Math.min(
                                option.max,
                                Math.trunc(Number(event.target.value)),
                              ),
                            ),
                          },
                        })
                      }
                    />
                    <small>0 to {option.max}</small>
                  </label>
                )}
              </div>
              <p>{option.effect.description}</p>
              <p className="combat-effect-values">
                {option.stats.map((stat) => stat.raw).join(" · ")}
                {option.max > 1 ? " per stack" : ""}
              </p>
              {option.omitted.length > 0 && (
                <p>
                  Scaled values are not added automatically:{" "}
                  {option.omitted.join("; ")}. Enter their resolved amounts as
                  additional sources below.
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p>No additional item buffs to select for this loadout.</p>
      )}
      <details className="additional-buffs">
        <summary>
          Other buffs and resistance reductions ({extra.length})
        </summary>
        <p>
          Add another hero or ally buff as a separate source. Enter its final
          listed amount after upgrades and scaling. Use negative resistance for
          an incoming resistance reduction.
        </p>
        {extra.map((source, index) => (
          <fieldset className="custom-buff" key={source.id}>
            <legend>Additional source {index + 1}</legend>
            <label>
              Source name
              <input
                aria-label={`Source ${index + 1} name`}
                maxLength="100"
                value={source.name}
                placeholder="Ability or buff name"
                onChange={(event) =>
                  updateExtra(source.id, { name: event.target.value })
                }
              />
            </label>
            <label>
              Stat
              <select
                aria-label={`Source ${index + 1} stat`}
                value={source.label}
                onChange={(event) =>
                  updateExtra(source.id, {
                    label: event.target.value,
                    value: 0,
                  })
                }
              >
                {Object.entries(statRules).map(([label, [, unit]]) => (
                  <option key={label} value={label}>
                    {label}
                    {unit ? ` (${unit})` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Amount
              <input
                type="number"
                aria-label={`Source ${index + 1} amount`}
                step="any"
                min={
                  statRules[source.label]?.[2] === "diminish" ? -100 : -100000
                }
                max={statRules[source.label]?.[2] === "diminish" ? 100 : 100000}
                value={source.value}
                onChange={(event) => {
                  const limit =
                    statRules[source.label]?.[2] === "diminish" ? 100 : 100000;
                  updateExtra(source.id, {
                    value: Math.max(
                      -limit,
                      Math.min(limit, Number(event.target.value) || 0),
                    ),
                  });
                }}
              />
            </label>
            <button
              onClick={() =>
                onChange({ extra: extra.filter((s) => s.id !== source.id) })
              }
            >
              Remove source {index + 1}
            </button>
          </fieldset>
        ))}
        <button
          onClick={() =>
            onChange({
              extra: [
                ...extra,
                {
                  id: crypto.randomUUID(),
                  name: "",
                  label: "Bullet Resist",
                  value: 0,
                },
              ],
            })
          }
        >
          Add stat source
        </button>
      </details>
      <p>
        Ability only bonuses remain scoped to their ability. Damage procs,
        barriers, enemy debuffs and unlisted hero buffs are not automatically
        folded into your character stats.
      </p>
      <button
        disabled={
          !settings.lycan &&
          !settings.lycanStacks &&
          !Object.values(effects).some(Boolean) &&
          !extra.length
        }
        onClick={() =>
          onChange({ lycan: false, lycanStacks: 0, effects: {}, extra: [] })
        }
      >
        Reset combat effects
      </button>
    </section>
  );
}
