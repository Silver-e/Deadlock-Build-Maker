import { assetUrl } from "./assets.js";
import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  items,
  byId,
  types,
  investment,
  thresholds,
  bonuses,
  equip,
  makeDraft,
  validDraft,
  moveDraftItem,
  uniqueDraftItems,
  snapshot,
} from "./model";
import StatPicker from "./StatPicker";
import { itemMatchesStat, itemStatLabels } from "./itemSearch.js";
import "./style.css";
import "./characters.css";
import EquippedStats from "./EquippedStats";
import ItemHover from "./ItemHover";
import StatIcon from "./StatIcon";
import CharacterPanel from "./CharacterPanel";
import CharacterStats from "./CharacterStats";
import AbilityPreview from "./AbilityPreview";
import { heroById, imbueTarget } from "./heroes";
import useItemDrag from "./useItemDrag";
import GameExport from "./GameExport";
import GameImport from "./GameImport";
import AbilityOrder from "./AbilityOrder";
import AbilityDetails from "./AbilityDetails";
const KEY = "deadlock-local-drafts-v1";
const money = (n) => n.toLocaleString("en-US");
function Icon({ name, size = 18 }) {
  if (types.includes(name)) {
    return (
      <img
        className="category-icon"
        src={assetUrl(`/icons/${name}.png`)}
        width={size}
        height={size}
        alt=""
        aria-hidden="true"
      />
    );
  }
  const paths = {
    plus: "M12 5v14M5 12h14",
    close: "m6 6 12 12M18 6 6 18",
    search: "M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
    trash: "M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7",
    up: "m6 15 6-6 6 6",
    down: "m6 9 6 6 6-6",
    undo: "M9 5 3 11l6 6M3 11h10a7 7 0 0 1 7 7",
    check: "m5 12 4 4L19 6",
    info: "M12 11v6M12 7h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
    folder: "M3 7V4h7l2 3h9v13H3V7Z",
    save: "M4 3h14l3 3v15H3V3h1ZM7 3v6h10V3M7 21v-8h10v8",
    lock: "M6 10h12v11H6V10ZM8 10V6a4 4 0 0 1 8 0v4",
    expand: "M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5",
    move: "M8 4h.01M16 4h.01M8 12h.01M16 12h.01M8 20h.01M16 20h.01",
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.info} />
    </svg>
  );
}
function initial() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s?.drafts?.length && s.drafts.every(validDraft)) {
      const drafts = s.drafts.map(uniqueDraftItems);
      const migrated = JSON.stringify(drafts) !== JSON.stringify(s.drafts);
      return {
        ...s,
        drafts,
        migrated,
        error: "",
        notice: migrated
          ? "Duplicate items in saved drafts were kept in their first category."
          : "",
      };
    }
    if (s) throw Error();
  } catch {
    return {
      drafts: [makeDraft()],
      error:
        "Saved data could not be read. A new draft is open. Existing storage will be kept until you save a change.",
    };
  }
  return { drafts: [makeDraft()], error: "" };
}
function App() {
  const [view, setView] = useState("build");
  const [boot] = useState(initial),
    [drafts, setDrafts] = useState(boot.drafts),
    [current, setCurrent] = useState(boot.current || boot.drafts[0].id),
    [tab, setTab] = useState("Weapon"),
    [search, setSearch] = useState(""),
    [statSearch, setStatSearch] = useState(""),
    [tier, setTier] = useState(0),
    [activeOnly, setActiveOnly] = useState(false),
    [selected, setSelected] = useState(boot.drafts[0].categories[0].id),
    [detail, setDetail] = useState(null),
    [message, setMessage] = useState(boot.error || boot.notice),
    [saved, setSaved] = useState(!boot.error),
    [library, setLibrary] = useState(false),
    [deleteId, setDeleteId] = useState(null),
    [history, setHistory] = useState([]);
  const dirty = useRef(!!boot.migrated),
    closeRef = useRef(null),
    detailTrigger = useRef(null);
  const draft = drafts.find((d) => d.id === current) || drafts[0];
  const category =
    draft.categories.find((c) => c.id === selected) || draft.categories[0];
  const itemDrag = useItemDrag((id, target, before) => {
    const destination = draft.categories.find((c) => c.id === target);
    moveItem(
      id,
      target,
      before ? destination.items.indexOf(before) : undefined,
    );
  });
  function update(fn) {
    dirty.current = true;
    setSaved(false);
    setHistory((h) => [...h.slice(-29), structuredClone(draft)]);
    setDrafts((ds) => ds.map((d) => (d.id === draft.id ? fn(d) : d)));
  }
  function undo() {
    const prev = history.at(-1);
    if (prev) {
      dirty.current = true;
      setSaved(false);
      setDrafts((ds) => ds.map((d) => (d.id === prev.id ? prev : d)));
      setHistory((h) => h.slice(0, -1));
    }
  }
  useEffect(() => {
    if (!dirty.current) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ drafts, current: draft.id }));
      setSaved(true);
    } catch {
      setSaved(false);
      setMessage(
        "Could not save locally. Your browser storage may be full or disabled. Keep this tab open and free some storage.",
      );
    }
  }, [drafts, current]);
  useEffect(() => {
    if (!message || message === boot.error) return;
    const t = setTimeout(() => setMessage(""), 6500);
    return () => clearTimeout(t);
  }, [message]);
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") {
        setDetail(null);
        setLibrary(false);
        setDeleteId(null);
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key === "z" &&
        !/INPUT|TEXTAREA/.test(e.target.tagName)
      ) {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [history]);
  useEffect(() => {
    if (detail) closeRef.current?.focus();
    else detailTrigger.current?.focus();
  }, [detail]);
  function goShop(id) {
    if (id) setSelected(id);
    setView("shop");
    setDetail(null);
    requestAnimationFrame(() =>
      document.querySelector("#item-search")?.focus(),
    );
  }
  function navigate(next, type) {
    setView(next);
    if (type) setTab(type);
    setDetail(null);
  }
  function inspect(item, event) {
    detailTrigger.current = event.currentTarget;
    setDetail(item.id);
  }
  function add(id) {
    if (!category.items.includes(id)) {
      moveItem(id, category.id);
      return;
    }
    update((d) => ({
      ...d,
      categories: d.categories.map((c) =>
        c.id === category.id
          ? {
              ...c,
              items: c.items.includes(id)
                ? c.items.filter((x) => x !== id)
                : [...c.items, id],
            }
          : c,
      ),
    }));
  }
  function toggleEquip(id) {
    const r = equip(draft.equipped, id, draft.extra);
    if (r.error) setMessage(r.error);
    else
      update((d) => {
        const target = imbueTarget(d, byId[id]);
        return {
          ...d,
          equipped: r.ids,
          imbues:
            target && r.ids.includes(id)
              ? { ...d.imbues, [id]: target }
              : d.imbues,
        };
      });
  }
  function editCategory(id, fields) {
    update((d) => ({
      ...d,
      categories: d.categories.map((c) =>
        c.id === id ? { ...c, ...fields } : c,
      ),
    }));
  }
  function moveCategory(id, delta) {
    const cs = [...draft.categories],
      i = cs.findIndex((c) => c.id === id);
    [cs[i], cs[i + delta]] = [cs[i + delta], cs[i]];
    update((d) => ({ ...d, categories: cs }));
  }
  function newDraft(d = makeDraft()) {
    setView("build");
    setDetail(null);
    dirty.current = true;
    setDrafts((ds) => [...ds, d]);
    setCurrent(d.id);
    setSelected(d.categories[0].id);
    setHistory([]);
    setLibrary(false);
  }
  function changeDraft(id) {
    setCurrent(id);
    setSelected(drafts.find((d) => d.id === id).categories[0].id);
    setHistory([]);
    setLibrary(false);
  }
  function drop(e, target, index) {
    e.preventDefault();
    try {
      const { id } = JSON.parse(e.dataTransfer.getData("text/plain"));
      moveItem(id, target, index);
    } catch {}
  }
  function moveItem(id, target, index) {
    const next = moveDraftItem(draft, id, target, index);
    if (JSON.stringify(next.categories) === JSON.stringify(draft.categories))
      return;
    update((d) => moveDraftItem(d, id, target, index));
    setSelected(target);
    const action = draft.categories.some((c) => c.items.includes(id))
      ? "moved"
      : "added";
    setMessage(
      `${byId[id].name} ${action} to ${next.categories.find((c) => c.id === target).name || "category"}.`,
    );
  }
  function addLabel(id) {
    const existing = draft.categories.find((c) => c.items.includes(id));
    if (existing?.id === category.id) return `Remove from ${category.name}`;
    if (existing) return `Move from ${existing.name} to ${category.name}`;
    return `Add to ${category.name || "category"}`;
  }
  function card(item, { inBuild = false, from = null } = {}) {
    const equipped = draft.equipped.includes(item.id),
      added = category.items.includes(item.id);
    return (
      <ItemHover
        item={item}
        draft={draft}
        hint={
          inBuild
            ? "Click to equip or unequip. Use the info button to inspect."
            : "Click to add to category. Shift click to equip."
        }
        tooltipId={`hover-${item.id}-${from || "shop"}`}
        disabled={!!detail || library || !!deleteId || !!itemDrag.drag}
        data-draft-item={inBuild ? item.id : undefined}
        className={`item tier-${item.tier} ${item.type.toLowerCase()} ${item.active ? "active-item" : ""} ${item.imbue ? "imbue-item" : ""} ${equipped ? "equipped" : ""} ${inBuild && itemDrag.drag?.id === item.id ? "drag-source" : ""} ${inBuild && itemDrag.drag?.target === from && itemDrag.drag?.before === item.id ? "drop-before" : ""}`}
        key={item.id}
        draggable
        onDragStart={(e) => {
          if (itemDrag.isPending()) {
            e.preventDefault();
            return;
          }
          e.dataTransfer.setData(
            "text/plain",
            JSON.stringify({ id: item.id, from }),
          );
        }}
        onDragOver={inBuild ? (e) => e.preventDefault() : undefined}
        onDrop={
          inBuild
            ? (e) => {
                e.stopPropagation();
                drop(
                  e,
                  from,
                  draft.categories
                    .find((c) => c.id === from)
                    .items.indexOf(item.id),
                );
              }
            : undefined
        }
      >
        <button
          className="item-main"
          aria-describedby={`hover-${item.id}-${from || "shop"}`}
          onClick={(e) =>
            inBuild || e.shiftKey ? toggleEquip(item.id) : add(item.id)
          }
          aria-label={`${inBuild ? "Equip or unequip" : addLabel(item.id)}: ${item.name}`}
        >
          <div className="item-art">
            <img src={assetUrl(item.icon)} alt="" />
            {item.imbue && <span className="imbue-label">IMBUE</span>}
            <span className="tier-marks">{"I".repeat(item.tier)}</span>
            {equipped && (
              <span className="equipped-mark">
                <Icon name="check" size={14} />
              </span>
            )}
          </div>
          <span className="item-name">{item.name}</span>
          {item.active && <span className="active-label">ACTIVE</span>}
        </button>
        {inBuild && (
          <button
            className="item-move"
            aria-label={`Move ${item.name}`}
            title="Drag to move. Tap for category options."
            onPointerDown={(event) => itemDrag.start(event, item.id)}
            onClick={(event) => {
              event.stopPropagation();
              if (!itemDrag.suppressClick()) inspect(item, event);
            }}
          >
            <Icon name="move" size={16} /> Move
          </button>
        )}
        <button
          className="inspect"
          aria-label={`Inspect ${item.name}`}
          onClick={(e) => inspect(item, e)}
        >
          <Icon name="info" size={14} />
        </button>
        {inBuild ? (
          <button
            className="remove-item"
            aria-label={`Remove ${item.name} from ${draft.categories.find((c) => c.id === from)?.name}`}
            onClick={() =>
              editCategory(from, {
                items: draft.categories
                  .find((c) => c.id === from)
                  .items.filter((id) => id !== item.id),
              })
            }
          >
            <Icon name="close" size={12} />
          </button>
        ) : (
          added && (
            <span className="in-category">
              <Icon name="check" size={12} />
            </span>
          )
        )}
      </ItemHover>
    );
  }
  const filtered = items.filter(
    (i) =>
      i.type === tab &&
      (!tier || i.tier === tier) &&
      (!activeOnly || i.active) &&
      itemMatchesStat(i, statSearch) &&
      `${i.name} ${i.description} ${i.stats.join(" ")}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const allDraftIds = [...new Set(draft.categories.flatMap((c) => c.items))];
  const total = draft.equipped.reduce((s, id) => s + byId[id].cost, 0);
  const item = byId[detail];
  return (
    <>
      <a className="skip" href="#content">
        Skip to content
      </a>
      <header className="masthead">
        <div className="wordmark">
          <Icon name="folder" size={32} />
          <h1>The Curiosity Shop</h1>
          <span className="local-tag">LOCAL BUILD PLANNER</span>
        </div>
        <div className="header-actions">
          <span className={`save-status ${!saved ? "unsaved" : ""}`}>
            <Icon name={saved ? "check" : "save"} size={14} />
            {saved ? "Saved on this computer" : "Not saved"}
          </span>
          <GameExport draft={draft} />
          <GameImport onImport={newDraft} />
          <button onClick={() => setLibrary(!library)} aria-expanded={library}>
            <Icon name="folder" />
            My drafts <span className="count">{drafts.length}</span>
          </button>
          <button className="cream-button" onClick={() => newDraft()}>
            <Icon name="plus" />
            New build
          </button>
        </div>
      </header>
      {library && (
        <section className="library" aria-label="My drafts">
          <div className="section-heading">
            <h2>My drafts</h2>
            <button
              className="icon-button"
              aria-label="Close drafts"
              onClick={() => setLibrary(false)}
            >
              <Icon name="close" />
            </button>
          </div>
          {drafts.map((d) => (
            <div className="draft-row" key={d.id}>
              <button
                aria-current={d.id === draft.id ? "true" : undefined}
                onClick={() => changeDraft(d.id)}
              >
                {heroById[d.heroId] && (
                  <img
                    className="draft-portrait"
                    src={assetUrl(heroById[d.heroId].portrait)}
                    alt={heroById[d.heroId].name}
                  />
                )}
                <span>
                  {d.name || "Untitled build"}
                  <small>
                    {heroById[d.heroId]?.name
                      ? `${heroById[d.heroId].name} · `
                      : ""}
                    {d.categories.length} categories · {d.equipped.length}{" "}
                    equipped
                  </small>
                </span>
              </button>
              <button
                className="icon-button"
                aria-label={`Delete ${d.name}`}
                onClick={() => setDeleteId(d.id)}
              >
                <Icon name="trash" />
              </button>
            </div>
          ))}
        </section>
      )}
      <main id="content">
        <nav className="page-tabs" aria-label="Planner pages">
          <button
            className={view === "build" ? "current" : ""}
            aria-current={view === "build" ? "page" : undefined}
            onClick={() => navigate("build")}
          >
            <Icon name="folder" />
            Build<span>{draft.categories.length} categories</span>
          </button>
          {types.map((type) => (
            <button
              key={type}
              className={
                type.toLowerCase() +
                (view === "shop" && tab === type ? " current" : "")
              }
              aria-current={
                view === "shop" && tab === type ? "page" : undefined
              }
              onClick={() => navigate("shop", type)}
            >
              <Icon name={type} />
              {type}
            </button>
          ))}
          <button
            className={view === "abilities" ? "current" : ""}
            aria-current={view === "abilities" ? "page" : undefined}
            onClick={() => navigate("abilities")}
          >
            Abilities
          </button>
          <button
            className={
              view === "loadout" ? "current loadout-tab" : "loadout-tab"
            }
            aria-current={view === "loadout" ? "page" : undefined}
            onClick={() => navigate("loadout")}
          >
            <Icon name="check" />
            Loadout & stats
            <span>
              {draft.equipped.length} / {9 + draft.extra}
            </span>
          </button>
        </nav>
        <CharacterPanel
          draft={draft}
          onChange={(fields) => update((d) => ({ ...d, ...fields }))}
        />
        <div className="workspace">
          <section
            hidden={view !== "build"}
            className="build-panel"
            aria-label="Build editor"
          >
            <div className="build-toolbar">
              <h2>Edit build</h2>
              <div className="build-toolbar-actions">
                <button className="cream-button" onClick={() => goShop()}>
                  <Icon name="plus" size={16} />
                  Add items
                </button>
                <button
                  onClick={undo}
                  disabled={!history.length}
                  title="Undo last change (Ctrl+Z)"
                >
                  <Icon name="undo" size={16} />
                  Undo
                </button>
              </div>
            </div>
            <div className="build-meta">
              <input
                className="build-name"
                aria-label="Build name"
                value={draft.name}
                maxLength={100}
                placeholder="Name your build"
                onChange={(e) =>
                  update((d) => ({ ...d, name: e.target.value }))
                }
              />
              <textarea
                aria-label="Build description"
                placeholder="What’s the idea behind this build?"
                rows="2"
                value={draft.description}
                onChange={(e) =>
                  update((d) => ({ ...d, description: e.target.value }))
                }
              />
            </div>
            <div className="categories-header">
              <span>{allDraftIds.length} draft items</span>
              <button
                onClick={() => {
                  const c = {
                    id: crypto.randomUUID(),
                    name: "New category",
                    description: "",
                    items: [],
                    wide: true,
                    optional: false,
                  };
                  update((d) => ({ ...d, categories: [...d.categories, c] }));
                  setSelected(c.id);
                }}
              >
                <Icon name="plus" size={16} />
                Add category
              </button>
            </div>
            <div className="categories">
              {draft.categories.map((c, ci) => (
                <section
                  key={c.id}
                  className={`category ${category.id === c.id ? "selected" : ""} ${c.wide ? "wide" : ""} ${c.optional ? "optional-category" : ""} ${itemDrag.drag?.target === c.id ? "drop-target" : ""}`}
                  data-category-id={c.id}
                  onClick={() => setSelected(c.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => drop(e, c.id)}
                  aria-label={c.name}
                >
                  <div className="category-top">
                    <input
                      aria-label={`Category ${ci + 1} name`}
                      value={c.name}
                      onChange={(e) =>
                        editCategory(c.id, { name: e.target.value })
                      }
                    />
                    <div className="category-tools">
                      <button
                        className="icon-button"
                        disabled={ci === 0}
                        aria-label={`Move ${c.name} up`}
                        onClick={() => moveCategory(c.id, -1)}
                      >
                        <Icon name="up" size={14} />
                      </button>
                      <button
                        className="icon-button"
                        disabled={ci === draft.categories.length - 1}
                        aria-label={`Move ${c.name} down`}
                        onClick={() => moveCategory(c.id, 1)}
                      >
                        <Icon name="down" size={14} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`Resize ${c.name}`}
                        title="Toggle full or half width"
                        onClick={() => editCategory(c.id, { wide: !c.wide })}
                      >
                        <Icon name="expand" size={14} />
                      </button>
                      <button
                        className="icon-button"
                        disabled={draft.categories.length === 1}
                        aria-label={`Delete category ${c.name}`}
                        onClick={() => {
                          update((d) => ({
                            ...d,
                            categories: d.categories.filter(
                              (x) => x.id !== c.id,
                            ),
                          }));
                        }}
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </div>
                  <input
                    className="category-description"
                    aria-label={`Description for ${c.name}`}
                    placeholder="Add a category note…"
                    value={c.description}
                    onChange={(e) =>
                      editCategory(c.id, { description: e.target.value })
                    }
                  />
                  <div className="category-items">
                    {c.items.map((id) =>
                      card(byId[id], { inBuild: true, from: c.id }),
                    )}
                    {!c.items.length && (
                      <button
                        className="empty-category"
                        onClick={() => {
                          goShop(c.id);
                        }}
                      >
                        <Icon name="plus" size={20} />
                        <span>
                          Add items from the shop
                          <br />
                          <small>or drag them here</small>
                        </span>
                      </button>
                    )}
                  </div>
                  <div className="category-footer">
                    <label
                      className="optional-toggle"
                      title="Mark this category as optional choices. Items still count in stats when equipped."
                    >
                      <input
                        type="checkbox"
                        aria-label={`Mark ${c.name} as optional`}
                        checked={!!c.optional}
                        onChange={(e) =>
                          editCategory(c.id, { optional: e.target.checked })
                        }
                      />
                      Optional category
                    </label>
                    {category.id === c.id && (
                      <span className="selection-label">Adding items here</span>
                    )}
                  </div>
                </section>
              ))}
            </div>
            <div className="build-help">
              <Icon name="info" size={16} />
              <p>
                Shop click: add to category. Draft click: equip.
                <br />
                Drag the Move handle to reorder or change categories. Tap Move
                for category options.
              </p>
            </div>
          </section>
          <section
            hidden={view !== "abilities"}
            className="build-panel"
            aria-label="Ability planner"
          >
            <div className="build-toolbar">
              <h2>Abilities</h2>
              <button
                onClick={undo}
                disabled={!history.length}
                title="Undo last change (Ctrl+Z)"
              >
                <Icon name="undo" size={16} /> Undo
              </button>
            </div>
            <AbilityOrder
              draft={draft}
              onChange={(abilityOrder) =>
                update((d) => ({ ...d, abilityOrder }))
              }
            />
            <AbilityDetails
              draft={draft}
              onChange={(fields) => update((d) => ({ ...d, ...fields }))}
            />
          </section>
          <section
            hidden={view !== "shop"}
            id="shop"
            className="shop-panel"
            aria-label="Item shop"
          >
            <div className="shop-destination">
              <label>
                Adding to{" "}
                <select
                  aria-label="Destination category"
                  value={category.id}
                  onChange={(e) => setSelected(e.target.value)}
                >
                  {draft.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name || "Unnamed category"}
                      {c.optional && c.name.toLowerCase() !== "optional"
                        ? " (Optional)"
                        : ""}
                    </option>
                  ))}
                </select>
              </label>
              <span>{category.items.length} items in category</span>
              <button
                className="cream-button"
                onClick={() => navigate("build")}
              >
                Return to build
              </button>
            </div>
            <div className="shop-filters">
              <label className="search">
                <Icon name="search" />
                <input
                  id="item-search"
                  placeholder="Search items or stats…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    aria-label="Clear search"
                    className="icon-button"
                    onClick={() => setSearch("")}
                  >
                    <Icon name="close" size={16} />
                  </button>
                )}
              </label>
              <StatPicker
                key={tab}
                labels={itemStatLabels(items.filter((i) => i.type === tab))}
                value={statSearch}
                onChange={setStatSearch}
              />
              <select
                aria-label="Price tier"
                value={tier}
                onChange={(e) => setTier(Number(e.target.value))}
              >
                <option value="0">All tiers</option>
                {[800, 1600, 3200, 6400].map((v, i) => (
                  <option value={i + 1} key={v}>
                    {money(v)} souls
                  </option>
                ))}
              </select>
              <label className="check-filter">
                <input
                  type="checkbox"
                  checked={activeOnly}
                  onChange={(e) => setActiveOnly(e.target.checked)}
                />
                Active only
              </label>
            </div>
            <p id="stat-search-help" className="stat-search-help">
              Stat search includes permanent, conditional, and activated
              effects.
            </p>
            <div className="shop-content">
              {[1, 2, 3, 4].map((t) => {
                const group = filtered.filter((i) => i.tier === t);
                return (
                  group.length > 0 && (
                    <section
                      className={`tier-section ${tab.toLowerCase()}`}
                      key={t}
                    >
                      <div className="tier-heading">
                        <span className="souls">
                          <img src={assetUrl("/souls.png")} alt="" />
                          {money([800, 1600, 3200, 6400][t - 1])}
                        </span>
                        <span className="tier-rule" />
                        <span>Tier {t}</span>
                      </div>
                      <div className="shop-grid">
                        {group.map((i) => card(i))}
                      </div>
                    </section>
                  )
                );
              })}
              {!filtered.length && (
                <div className="empty-search">
                  <Icon name="search" size={32} />
                  <h3>No matching items</h3>
                  <p>Try a different name or stat, or reset the filters.</p>
                  <button
                    onClick={() => {
                      setSearch("");
                      setStatSearch("");
                      setTier(0);
                      setActiveOnly(false);
                    }}
                  >
                    Reset filters
                  </button>
                </div>
              )}
            </div>
            <div className="shop-foot">
              <span>{filtered.length} items</span>
              <span>
                Adding to <b>{category.name || "Unnamed category"}</b>
                {category.optional && (
                  <span className="optional-indicator">Optional category</span>
                )}
              </span>
              <span>Shift + click to equip</span>
            </div>
          </section>
        </div>
        <section
          hidden={view !== "loadout"}
          className="loadout-panel"
          aria-label="Equipped loadout"
        >
          <div className="loadout-heading">
            <h2>
              Equipped loadout{" "}
              <span>
                {draft.equipped.length} / {9 + draft.extra}
              </span>
            </h2>
            <div>
              <label>
                Extra slots{" "}
                <select
                  aria-label="Unlocked extra slots"
                  value={draft.extra}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (draft.equipped.length > 9 + n) {
                      setMessage(
                        "Remove items before reducing the number of extra slots.",
                      );
                      return;
                    }
                    update((d) => ({ ...d, extra: n }));
                  }}
                >
                  {[0, 1, 2, 3].map((n) => (
                    <option key={n} value={n}>
                      {n} / 3
                    </option>
                  ))}
                </select>
              </label>
              <button
                disabled={!draft.equipped.length}
                onClick={() => update((d) => ({ ...d, equipped: [] }))}
              >
                Clear loadout
              </button>
              <span className="total-souls">
                <img src={assetUrl("/souls.png")} alt="Souls" />
                {money(total)}
              </span>
            </div>
          </div>
          <div className="loadout-body">
            <div className="inventory">
              {Array.from({ length: 12 }, (_, idx) => {
                const i = byId[draft.equipped[idx]],
                  locked = idx >= 9 + draft.extra;
                return (
                  <button
                    key={idx}
                    className={`inventory-slot ${i?.type.toLowerCase() || ""} ${locked ? "locked" : ""}`}
                    disabled={locked || !i}
                    aria-label={
                      i
                        ? `Unequip ${i.name}`
                        : locked
                          ? "Locked extra slot"
                          : `Empty slot ${idx + 1}`
                    }
                    title={
                      i
                        ? `${i.name} · Click to unequip`
                        : idx >= 9
                          ? "Extra slot"
                          : "Empty slot"
                    }
                    onClick={() => toggleEquip(i.id)}
                    onContextMenu={(e) => {
                      if (i) {
                        e.preventDefault();
                        inspect(i, e);
                      }
                    }}
                  >
                    {i ? (
                      <>
                        <img src={assetUrl(i.icon)} alt={i.name} />
                        <span className="slot-remove">
                          <Icon name="close" size={14} />
                        </span>
                      </>
                    ) : (
                      <Icon name={locked ? "lock" : "plus"} size={16} />
                    )}
                  </button>
                );
              })}
              <span className="inventory-note">
                12 universal slots · max 4 active items · click to unequip
              </span>
            </div>
            <div className="investments">
              {types.map((type) => {
                const s = investment(draft.equipped, type);
                return (
                  <details
                    className={`investment ${type.toLowerCase()} ${s.souls >= 4800 ? "spike-unlocked" : "spike-locked"}`}
                    key={type}
                  >
                    <summary>
                      <span className="investment-head">
                        <span>
                          <Icon name={type} size={16} />
                          {type}
                        </span>
                        <b>
                          +{s.bonus}
                          {type === "Spirit" ? "" : "%"}{" "}
                          <small>
                            {type === "Weapon"
                              ? "weapon damage"
                              : type === "Vitality"
                                ? "health"
                                : "spirit power"}
                          </small>
                        </b>
                        <span className="investment-souls">
                          {money(s.souls)} <small>souls</small>
                        </span>
                      </span>
                      <span className="bar-track">
                        <span
                          className="bar-fill"
                          style={{
                            transform: `scaleX(${Math.min(s.souls / 28800, 1)})`,
                          }}
                        />
                        {thresholds.slice(0, -1).map((t) =>
                          t === 4800 ? (
                            <span
                              key={t}
                              className="investment-spike-marker"
                              style={{ left: `${(t / 28800) * 100}%` }}
                              role="img"
                              aria-label={`4,800 soul spike ${s.souls >= t ? "unlocked" : "locked"}`}
                            >
                              <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="m12 2 3 6.2 6.8 1-4.9 4.8 1.2 6.8-6.1-3.2-6.1 3.2 1.2-6.8L2.2 9.2l6.8-1Z" />
                              </svg>
                              <b>4.8k</b>
                            </span>
                          ) : (
                            <i
                              key={t}
                              style={{ left: `${(t / 28800) * 100}%` }}
                            />
                          ),
                        )}
                      </span>
                      <span className="bar-caption">
                        {s.next
                          ? `${money(s.next - s.souls)} to next bonus`
                          : "Maximum investment bonus"}
                        <span>{s.next ? money(s.next) : "28,800"} souls</span>
                      </span>
                    </summary>
                    <div className="threshold-popover">
                      <strong>{type} investment bonuses</strong>
                      <div className="threshold-grid">
                        {thresholds.map((t, i) => (
                          <span
                            key={t}
                            className={`${s.souls >= t ? "reached" : ""} ${t === 4800 ? "spike-threshold" : ""}`}
                          >
                            {money(t)}
                            {t === 4800 && <small>Power spike</small>}
                            <b>
                              +{bonuses[type][i]}
                              {type === "Spirit" ? "" : "%"}
                            </b>
                          </span>
                        ))}
                      </div>
                      <p>
                        Only equipped items count. Item stats are additional to
                        these bonuses.
                      </p>
                    </div>
                  </details>
                );
              })}
            </div>
          </div>
        </section>
        {view === "loadout" && (
          <CharacterStats
            draft={draft}
            onCombatChange={(fields) =>
              update((d) => ({ ...d, combat: { ...d.combat, ...fields } }))
            }
            onRankChange={(rank, slot = "4") =>
              update((d) => ({
                ...d,
                abilityRanks: { ...d.abilityRanks, [slot]: rank },
              }))
            }
          />
        )}
        {view === "loadout" && (
          <EquippedStats
            ids={draft.equipped}
            hasCharacter={!!heroById[draft.heroId]}
            onInspect={(id, e) => inspect(byId[id], e)}
          />
        )}
      </main>
      <footer>
        <span>Unofficial Deadlock build planner. Game assets © Valve.</span>
        <span>
          Data:{" "}
          <a
            href="https://deadlock.wiki/Items"
            target="_blank"
            rel="noreferrer"
          >
            Deadlock Wiki
          </a>{" "}
          ·{" "}
          <a
            href="https://creativecommons.org/licenses/by-sa/4.0/"
            target="_blank"
            rel="noreferrer"
          >
            CC BY-SA
          </a>{" "}
          · Snapshot {snapshot.retrieved.slice(0, 10)}
        </span>
      </footer>
      {message && (
        <div className="toast" role="status">
          <Icon name="info" />
          <span>{message}</span>
          <button
            className="icon-button"
            aria-label="Dismiss message"
            onClick={() => setMessage("")}
          >
            <Icon name="close" />
          </button>
        </div>
      )}
      {item && (
        <aside
          className={`item-detail ${item.type.toLowerCase()}`}
          aria-label={`${item.name} details`}
        >
          <div className="detail-heading">
            <img src={assetUrl(item.icon)} alt="" />
            <div>
              <h2>{item.name}</h2>
              <span className="souls">
                {money(item.cost)} souls · Tier {item.tier}
              </span>
            </div>
            <button
              ref={closeRef}
              className="icon-button"
              aria-label="Close item details"
              onClick={() => setDetail(null)}
            >
              <Icon name="close" />
            </button>
          </div>
          <div className="detail-body">
            <span className="detail-type">
              {item.type} · {item.active ? "Active" : "Passive"}
              {item.cooldown > 0 ? ` · ${item.cooldown}s cooldown` : ""}
            </span>
            <ul className="item-stats">
              {item.stats.map((s, i) => (
                <li key={i}>
                  <StatIcon stat={s} />
                  {s}
                </li>
              ))}
            </ul>
            {item.description && (
              <p className="description">{item.description}</p>
            )}
            {item.effects.map((s, i) => (
              <p className="effect-stat" key={i}>
                {s}
              </p>
            ))}
            <AbilityPreview draft={draft} item={item} />
            {item.components.length > 0 && (
              <div className="components">
                <h3>Builds from</h3>
                {item.components
                  .filter((id) => byId[id])
                  .map((id) => (
                    <button key={id} onClick={() => setDetail(id)}>
                      <img src={assetUrl(byId[id].icon)} alt="" />
                      {byId[id].name}
                      <small>{money(byId[id].cost)}</small>
                    </button>
                  ))}
              </div>
            )}
            {items.some((i) => i.components.includes(item.id)) && (
              <div className="components">
                <h3>Upgrades to</h3>
                {items
                  .filter((i) => i.components.includes(item.id))
                  .map((i) => (
                    <button key={i.id} onClick={() => setDetail(i.id)}>
                      <img src={assetUrl(i.icon)} alt="" />
                      {i.name}
                      <small>{money(i.cost)}</small>
                    </button>
                  ))}
              </div>
            )}
            <a
              className="wiki-link"
              href={item.source}
              target="_blank"
              rel="noreferrer"
            >
              View item on Deadlock Wiki
            </a>
          </div>
          <div className="detail-actions">
            <button onClick={() => add(item.id)}>{addLabel(item.id)}</button>
            <button
              className="cream-button"
              onClick={() => toggleEquip(item.id)}
            >
              {draft.equipped.includes(item.id) ? "Unequip item" : "Equip item"}
            </button>
          </div>
          {draft.categories.some((c) => c.items.includes(item.id)) && (
            <label className="item-move-destination">
              Move to category
              <select
                aria-label={`Category for ${item.name}`}
                value={
                  draft.categories.find((c) => c.items.includes(item.id)).id
                }
                onChange={(event) => moveItem(item.id, event.target.value)}
              >
                {draft.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || "Unnamed category"}
                  </option>
                ))}
              </select>
            </label>
          )}
        </aside>
      )}
      {itemDrag.drag && (
        <div
          className="item-drag-preview"
          aria-hidden="true"
          style={{
            transform: `translate(${Math.min(Math.max(8, itemDrag.drag.x - 80), window.innerWidth - 168)}px, ${Math.max(8, itemDrag.drag.y - 64)}px)`,
          }}
        >
          <img src={assetUrl(byId[itemDrag.drag.id].icon)} alt="" />
          {byId[itemDrag.drag.id].name}
        </div>
      )}
      {deleteId && (
        <div className="dialog-backdrop">
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            className="delete-dialog"
          >
            <h2 id="delete-title">Delete this draft?</h2>
            <p>
              “{drafts.find((d) => d.id === deleteId)?.name || "Untitled build"}
              ” will be removed from this computer.
            </p>
            <div>
              <button autoFocus onClick={() => setDeleteId(null)}>
                Keep draft
              </button>
              <button
                className="danger"
                onClick={() => {
                  let ds = drafts.filter((d) => d.id !== deleteId);
                  if (!ds.length) ds = [makeDraft()];
                  dirty.current = true;
                  setDrafts(ds);
                  if (deleteId === draft.id) {
                    setCurrent(ds[0].id);
                    setSelected(ds[0].categories[0].id);
                    setHistory([]);
                  }
                  setDeleteId(null);
                }}
              >
                Delete draft
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
createRoot(document.getElementById("root")).render(<App />);
