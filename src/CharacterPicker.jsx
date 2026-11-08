import React, { useEffect, useId, useRef, useState } from "react";
import { heroes, heroById } from "./heroes";
import { assetUrl } from "./assets.js";
import "./stat-picker.css";
import "./character-picker.css";

export default function CharacterPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(-1);
  const root = useRef(null);
  const input = useRef(null);
  const id = useId();
  const matches = heroes.filter((hero) =>
    hero.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const options = [{ id: "", name: "Choose a character" }, ...matches];
  function close() {
    setOpen(false);
    setQuery("");
    setActive(-1);
  }
  function choose(hero) {
    onChange(hero.id);
    close();
    input.current?.focus();
  }
  useEffect(() => {
    const dismiss = (event) => {
      if (!root.current?.contains(event.target)) close();
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, []);
  useEffect(() => {
    close();
  }, [value]);
  useEffect(() => {
    if (open && active >= 0)
      document
        .getElementById(`${id}-${active}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [active, open, id]);
  return (
    <div
      className="character-select character-picker"
      ref={root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) close();
      }}
    >
      <label htmlFor={`${id}-input`}>Character</label>
      <div className="search stat-picker-field">
        <input
          id={`${id}-input`}
          ref={input}
          role="combobox"
          aria-label="Build character"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={open ? id : undefined}
          aria-activedescendant={
            open && active >= 0 ? `${id}-${active}` : undefined
          }
          autoComplete="off"
          placeholder="Choose a character"
          value={open ? query : heroById[value]?.name || ""}
          onClick={() => {
            setOpen(true);
            setActive(-1);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              close();
            }
            if (["ArrowDown", "ArrowUp"].includes(event.key)) {
              event.preventDefault();
              setOpen(true);
              setActive((index) =>
                index < 0
                  ? event.key === "ArrowDown"
                    ? 0
                    : options.length - 1
                  : (index +
                      (event.key === "ArrowDown" ? 1 : -1) +
                      options.length) %
                    options.length,
              );
            }
            if (event.key === "Enter") {
              event.preventDefault();
              if (open && active >= 0) choose(options[active]);
              else setOpen(true);
            }
          }}
        />
        <button
          type="button"
          className="stat-picker-control"
          aria-label={
            open ? "Close character suggestions" : "Browse characters"
          }
          aria-expanded={open}
          onClick={() => {
            input.current?.focus();
            if (open) close();
            else setOpen(true);
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d={open ? "m6 15 6-6 6 6" : "m6 9 6 6 6-6"} />
          </svg>
        </button>
      </div>
      {open && (
        <div className="stat-picker-menu">
          <div className="stat-picker-caption">
            {matches.length} matching characters
          </div>
          <div
            id={id}
            role="listbox"
            aria-label="Character suggestions"
            className="stat-picker-list"
          >
            {options.map((hero, index) => (
              <div
                key={hero.id}
                id={`${id}-${index}`}
                role="option"
                aria-selected={(value || "") === hero.id}
                className={`stat-picker-option ${active === index ? "highlighted" : ""}`}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => choose(hero)}
              >
                <span>{hero.name}</span>
                {hero.portrait && (
                  <img
                    className="character-picker-icon"
                    src={assetUrl(hero.portrait)}
                    alt=""
                    loading="lazy"
                  />
                )}
              </div>
            ))}
          </div>
          {!matches.length && (
            <p className="stat-picker-empty">
              No characters match. Try another name.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
