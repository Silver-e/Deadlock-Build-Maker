import React from "react";
import { assetUrl } from "./assets.js";
import { heroById } from "./heroes.js";
import {
  abilityPlanSteps,
  MAX_ABILITY_STEPS,
  setAbilityStep,
} from "./abilityPlan.js";
import "./ability-order.css";

function Pip({ unlock }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={`ability-plan-pip ${unlock ? "unlock" : ""}`}
    >
      <path d="M8 1 15 8h-4v7H5V8H1Z" fill="currentColor" />
    </svg>
  );
}

export default function AbilityOrder({ draft, onChange }) {
  const hero =
    heroById[
      draft.heroId === "hero_werewolf_transformed"
        ? "hero_werewolf"
        : draft.heroId
    ];
  const order = draft.abilityOrder || [];
  const steps = abilityPlanSteps(order);
  const columns = Array.from({ length: MAX_ABILITY_STEPS }, (_, i) => i);
  return (
    <section className="ability-plan" aria-labelledby="ability-plan-title">
      <div className="ability-plan-heading">
        <h3 id="ability-plan-title">Ability point order</h3>
        <div>
          <button
            disabled={!order.length}
            onClick={() => onChange(order.slice(0, -1))}
          >
            Undo step
          </button>
          <button disabled={!order.length} onClick={() => onChange([])}>
            Reset order
          </button>
        </div>
      </div>
      {!hero ? (
        <p>Choose a character above to plan ability unlocks and upgrades.</p>
      ) : (
        <>
          <div
            className="ability-plan-scroll"
            tabIndex={0}
            role="region"
            aria-label="Ability point order grid"
            aria-describedby="ability-plan-help"
          >
            <table
              className="ability-plan-grid"
              aria-label={`${hero.name} ability order`}
            >
              <thead>
                <tr>
                  <th scope="col" aria-label="Ability" />
                  {columns.map((i) => (
                    <th
                      scope="col"
                      key={i}
                      className={i === order.length ? "next-step" : ""}
                    >
                      {i + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hero.abilities.map((ability) => (
                  <tr key={ability.slot}>
                    <th scope="row" title={`${ability.slot}. ${ability.name}`}>
                      <img
                        src={assetUrl(ability.icon)}
                        alt={`${ability.slot}. ${ability.name}`}
                      />
                    </th>
                    {columns.map((index) => {
                      const step = steps[index];
                      const active = step?.slot === ability.slot;
                      const candidate = setAbilityStep(
                        order,
                        index,
                        ability.slot,
                      );
                      const disabled =
                        index > order.length ||
                        (candidate === order && !active);
                      const tier = candidate
                        .slice(0, index)
                        .filter((slot) => slot === ability.slot).length;
                      const action = tier === 0 ? "Unlock" : `Tier ${tier}`;
                      const label = `Step ${index + 1}: ${action} ${ability.name}`;
                      const description =
                        tier === 0
                          ? ability.descriptions?.join(" ")
                          : ability.upgradeDescriptions?.[tier - 1];
                      return (
                        <td
                          key={index}
                          className={index === order.length ? "next-step" : ""}
                        >
                          <button
                            disabled={disabled}
                            aria-label={label}
                            aria-pressed={active}
                            title={
                              disabled
                                ? "Complete earlier steps first, with at most three upgrades per ability."
                                : `${label}${active && !step.unlock ? ` · ${step.cost} AP` : ""}\n${description || ""}`
                            }
                            className={`${active ? "assigned" : ""} ${active && step.unlock ? "unlock-step" : ""}`}
                            onClick={() => onChange(candidate)}
                          >
                            {active ? (
                              <>
                                <Pip unlock={step.unlock} />
                                {!step.unlock && <span>{step.cost}</span>}
                              </>
                            ) : index === order.length && !disabled ? (
                              <span
                                className="ability-plan-add"
                                aria-hidden="true"
                              >
                                +
                              </span>
                            ) : null}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="ability-plan-footer">
            <p id="ability-plan-help">
              Choose a row in the next column to add a step. Change an earlier
              column to edit it; full rows swap steps.
            </p>
            <span>
              {order.length} / 16 steps ·{" "}
              {steps.reduce((sum, step) => sum + step.cost, 0)} / 32 AP
            </span>
          </div>
          <p className="ability-plan-legend">
            <Pip unlock /> Unlock <Pip /> Upgrade cost · Included in Copy for
            Deadlock for in-game recommendations.
          </p>
        </>
      )}
    </section>
  );
}
