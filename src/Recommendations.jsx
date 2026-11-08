import React, { useState } from "react";
import { recommendationsFor, researchedAt } from "./recommendations.js";
import { heroById } from "./heroes";
import { byId } from "./model.js";
import { assetUrl } from "./assets.js";
import { abilityPlanSteps } from "./abilityPlan.js";
import "./recommendations.css";

export default function Recommendations({ draft, onItems, onOrder }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("observed");
  const [status, setStatus] = useState("");
  const entry = recommendationsFor(draft.heroId);
  const profile =
    entry?.profiles.find((p) => p.id === selected) || entry?.profiles[0];
  const existing = new Set(draft.categories.flatMap((c) => c.items));
  const missing =
    profile?.stages.flatMap((s) => s.items).filter((id) => !existing.has(id)) ||
    [];
  const planHero = heroById[entry?.heroId];
  function add(id) {
    onItems(profile, id);
    setStatus(
      id
        ? `${byId[id].name} added. Undo is available in the build editor.`
        : "Missing suggestions added to Recommended categories. Undo is available in the build editor.",
    );
  }
  return (
    <section className="recommendations" aria-label="Build recommendations">
      <button aria-expanded={open} onClick={() => setOpen(!open)}>
        Recommend items & abilities
      </button>
      {open && (
        <div className="recommendations-body">
          {!entry ? (
            <p>Select a character to see researched build recommendations.</p>
          ) : (
            <>
              <h2>Recommendations for {heroById[draft.heroId].name}</h2>
              <p>
                Research snapshot: {researchedAt}. Compare styles before adding
                items. Sources may describe different patches; these are
                starting points, not a live tier list.
              </p>
              {draft.heroId === "hero_werewolf_transformed" && (
                <p>
                  Silver shares item builds across both forms. Ability plans
                  below use normal Silver's unlock and upgrade slots.
                </p>
              )}
              <label>
                Build style
                <select
                  value={profile.id}
                  onChange={(e) => {
                    setSelected(e.target.value);
                    setStatus("");
                  }}
                >
                  {entry.profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <p>{profile.description}</p>
              {profile.sourceUpdated && (
                <p>Guide updated: {profile.sourceUpdated}</p>
              )}
              <div className="recommendation-sources">
                {profile.sources.map((s) => (
                  <a key={s.url} href={s.url} target="_blank" rel="noreferrer">
                    {s.title}
                  </a>
                ))}
                <a href={entry.wiki} target="_blank" rel="noreferrer">
                  Character kit · Deadlock Wiki
                </a>
              </div>
              <details>
                <summary>Compare the sources</summary>
                <p>{entry.comparison.note}</p>
                <p>
                  Shared items:{" "}
                  {entry.comparison.common
                    .map((id) => byId[id].name)
                    .join(", ") || "No exact shared items in this snapshot."}
                </p>
                <p>
                  The observed profile describes common phase purchases; the
                  game default provides a staged plan. Named guide profiles keep
                  their own item and ability choices instead of mixing
                  playstyles.
                </p>
              </details>
              {!!profile.omitted.length && (
                <p>
                  Unavailable in DBM's catalog: {profile.omitted.join(", ")}.
                  These items are omitted, not substituted.
                </p>
              )}
              <button disabled={!missing.length} onClick={() => add()}>
                Add missing suggested items
              </button>
              <p>
                Suggestions are appended to Recommended categories. Items
                already in your draft are kept where they are. This does not
                equip items.
              </p>
              <div className="recommendation-stages">
                {profile.stages.map((stage) => (
                  <section key={stage.name}>
                    <h3>
                      {stage.name}
                      {stage.timing ? ` · ${stage.timing}` : ""}
                    </h3>
                    <ul>
                      {stage.items.map((id) => (
                        <li key={id}>
                          <img
                            src={assetUrl(byId[id].icon)}
                            alt=""
                            loading="lazy"
                          />
                          <span>{byId[id].name}</span>
                          <button
                            disabled={existing.has(id)}
                            aria-label={`Recommend ${byId[id].name}`}
                            onClick={() => add(id)}
                          >
                            {existing.has(id) ? "In draft" : "Add"}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
              <h3>Ability order</h3>
              {profile.abilityOrder.length ? (
                <>
                  <p>
                    Each step is an unlock or an upgrade, in order. Applying
                    replaces your current ability plan and can be undone.
                  </p>
                  <ol className="recommendation-order">
                    {abilityPlanSteps(profile.abilityOrder).map((step) => (
                      <li key={step.index}>
                        {
                          planHero.abilities.find((a) => a.slot === step.slot)
                            ?.name
                        }{" "}
                        · {step.unlock ? "Unlock" : `Tier ${step.tier}`}
                      </li>
                    ))}
                  </ol>
                  <button
                    onClick={() => {
                      onOrder(profile.abilityOrder);
                      setStatus(
                        "Ability plan applied. Undo is available in the build editor.",
                      );
                    }}
                  >
                    Use this ability order
                  </button>
                </>
              ) : (
                <p>
                  No verified ability sequence for this profile. Your plan is
                  kept. Compare the game-default profile or open its source for
                  further guidance.
                </p>
              )}
              {status && <p role="status">{status}</p>}
            </>
          )}
        </div>
      )}
    </section>
  );
}
