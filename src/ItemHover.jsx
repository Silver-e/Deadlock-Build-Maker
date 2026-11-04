import { assetUrl } from "./assets.js";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { byId, items } from "./model";
import StatIcon from "./StatIcon";
import AbilityPreview from "./AbilityPreview";

function Metric({ stat }) {
  const match = stat.match(
    /^([+−-]?\d[\d.,]*(?:\s*x[+−-]?\d[\d.,]*)?(?:%|m\/s|HP\/s|m|s|\/s)?)\s+(.+)$/,
  );
  if (!match)
    return (
      <li className="tooltip-metric text-metric">
        <StatIcon stat={stat} />
        {stat}
      </li>
    );
  const [value, scale] = match[1].split(/\s+x/);
  return (
    <li className="tooltip-metric">
      <strong>
        <StatIcon stat={stat} size={20} />
        {value}
        {scale && (
          <small className="tooltip-scaling">
            <StatIcon stat="Spirit scaling" size={18} /> x{scale}
          </small>
        )}
      </strong>
      <span>{match[2]}</span>
    </li>
  );
}

export default function ItemHover({
  item,
  draft,
  tooltipId,
  disabled,
  hint = "Click the item to add it. Use the info button to inspect.",
  children,
  ...props
}) {
  const anchor = useRef(null),
    panel = useRef(null),
    timer = useRef(null),
    [open, setOpen] = useState(false),
    [position, setPosition] = useState(null);
  const cancel = () => clearTimeout(timer.current);
  const hide = () => {
    cancel();
    setOpen(false);
    setPosition(null);
  };
  const show = () => {
    cancel();
    if (!disabled) timer.current = setTimeout(() => setOpen(true), 180);
  };
  const leave = () => {
    cancel();
    timer.current = setTimeout(hide, 120);
  };
  useEffect(() => {
    if (disabled) hide();
  }, [disabled]);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (!open) return;
    const dismiss = (e) => {
      if (e.key === "Escape") hide();
    };
    const scroll = (e) => {
      if (!panel.current?.contains(e.target)) hide();
    };
    window.addEventListener("keydown", dismiss);
    window.addEventListener("scroll", scroll, true);
    window.addEventListener("resize", hide);
    return () => {
      window.removeEventListener("keydown", dismiss);
      window.removeEventListener("scroll", scroll, true);
      window.removeEventListener("resize", hide);
    };
  }, [open]);
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const a = anchor.current.getBoundingClientRect(),
        p = panel.current.getBoundingClientRect(),
        gap = 12,
        space = window.innerWidth - a.right;
      let left =
        space >= p.width + gap ? a.right + gap : a.left - p.width - gap;
      left = Math.max(12, Math.min(left, window.innerWidth - p.width - 12));
      const top = Math.max(
        12,
        Math.min(a.top, window.innerHeight - p.height - 12),
      );
      setPosition((previous) =>
        previous?.left === left && previous?.top === top
          ? previous
          : { left, top },
      );
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(panel.current);
    return () => observer.disconnect();
  }, [open, item.id]);
  return (
    <>
      <div
        {...props}
        ref={anchor}
        onPointerEnter={(e) => {
          if (e.pointerType === "mouse") show();
        }}
        onPointerLeave={leave}
        onFocusCapture={(e) => {
          if (e.target.matches(":focus-visible")) show();
        }}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) hide();
        }}
        onPointerDown={hide}
        onDragStart={(e) => {
          hide();
          props.onDragStart?.(e);
        }}
      >
        {children}
      </div>
      {open &&
        !disabled &&
        createPortal(
          <div
            ref={panel}
            id={tooltipId}
            role="tooltip"
            className={`item-tooltip ${item.type.toLowerCase()}`}
            style={{
              left: position?.left ?? 0,
              top: position?.top ?? 0,
              visibility: position ? "visible" : "hidden",
            }}
            onPointerEnter={cancel}
            onPointerLeave={leave}
          >
            <div className="tooltip-surface">
              <div className="tooltip-heading">
                <img src={assetUrl(item.icon)} alt="" />
                <div>
                  <h3>{item.name}</h3>
                  <div className="tooltip-price">
                    <img src={assetUrl("/souls.png")} alt="" />
                    {item.cost.toLocaleString("en-US")}
                    <span>souls</span>
                    <small>
                      Tier {item.tier} · {item.type}
                    </small>
                  </div>
                </div>
              </div>
              <div className="tooltip-content">
                {item.stats.length > 0 && (
                  <ul className="tooltip-stats">
                    {item.stats.map((stat, i) => (
                      <li key={i}>
                        <StatIcon stat={stat} />
                        <strong>{stat.match(/^[^ ]+/)?.[0]}</strong>{" "}
                        {stat.replace(/^[^ ]+\s*/, "")}
                      </li>
                    ))}
                  </ul>
                )}
                {item.effectGroups?.map((effect, i) => (
                  <section className="tooltip-effect" key={i}>
                    <div className="tooltip-effect-heading">
                      <strong>{effect.kind}</strong>
                      {effect.kind === "Active" && item.cooldown > 0 && (
                        <span className="tooltip-cooldown">
                          <StatIcon stat="Cooldown" size={18} />
                          {item.cooldown}s cooldown
                        </span>
                      )}
                    </div>
                    {effect.description && <p>{effect.description}</p>}
                    {effect.stats.length > 0 && (
                      <>
                        <ul className="tooltip-metrics">
                          {effect.stats.slice(0, 3).map((stat, j) => (
                            <Metric stat={stat} key={j} />
                          ))}
                        </ul>
                        {effect.stats.length > 3 && (
                          <ul className="tooltip-secondary-stats">
                            {effect.stats.slice(3).map((stat, j) => (
                              <li key={j}>
                                <StatIcon stat={stat} size={16} />
                                {stat}
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    )}
                  </section>
                ))}
                {item.components.some((id) => byId[id]) && (
                  <section className="tooltip-recipe">
                    <h4>Components</h4>
                    {item.components
                      .filter((id) => byId[id])
                      .map((id) => (
                        <div key={id}>
                          <img src={assetUrl(byId[id].icon)} alt="" />
                          <span>{byId[id].name}</span>
                          <small>{byId[id].cost.toLocaleString("en-US")}</small>
                        </div>
                      ))}
                  </section>
                )}
                {items.some((i) => i.components.includes(item.id)) && (
                  <section className="tooltip-recipe">
                    <h4>Upgrades to</h4>
                    {items
                      .filter((i) => i.components.includes(item.id))
                      .map((i) => (
                        <div key={i.id}>
                          <img src={assetUrl(i.icon)} alt="" />
                          <span>{i.name}</span>
                          <small>{i.cost.toLocaleString("en-US")}</small>
                        </div>
                      ))}
                  </section>
                )}
                <AbilityPreview draft={draft} item={item} />
                <p className="tooltip-hint">{hint}</p>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
