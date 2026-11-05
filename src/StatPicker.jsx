import React, { useEffect, useId, useRef, useState } from "react";
import StatIcon from "./StatIcon";
import "./stat-picker.css";

export default function StatPicker({ labels, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const root = useRef(null);
  const input = useRef(null);
  const id = useId();
  const matches = labels.filter((label) =>
    value
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .every((word) => label.toLowerCase().includes(word)),
  );
  useEffect(() => {
    const dismiss = (event) => {
      if (!root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, []);
  useEffect(() => {
    if (open && active >= 0)
      document
        .getElementById(`${id}-${active}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [active, open, id]);
  const choose = (label) => {
    onChange(label);
    setOpen(false);
    setActive(-1);
    input.current?.blur();
  };
  return (
    <div
      className="stat-picker"
      ref={root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <div className="search stat-picker-field">
        {labels.includes(value) ? (
          <StatIcon stat={value} size={20} />
        ) : (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <circle cx="10" cy="10" r="7" />
            <path d="m15 15 6 6" />
          </svg>
        )}
        <input
          ref={input}
          role="combobox"
          aria-label="Search stats"
          aria-describedby="stat-search-help"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={open ? id : undefined}
          aria-activedescendant={
            open && active >= 0 && matches[active]
              ? `${id}-${active}`
              : undefined
          }
          autoComplete="off"
          placeholder="Search stats"
          value={value}
          onFocus={() => {
            setOpen(true);
            setActive(-1);
          }}
          onClick={() => setOpen(true)}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              setOpen(false);
              setActive(-1);
            }
            if (["ArrowDown", "ArrowUp"].includes(event.key)) {
              event.preventDefault();
              setOpen(true);
              setActive((index) =>
                matches.length
                  ? (index +
                      (event.key === "ArrowDown" ? 1 : -1) +
                      matches.length) %
                    matches.length
                  : -1,
              );
            }
            if (event.key === "Enter" && open) {
              event.preventDefault();
              if (matches[active]) choose(matches[active]);
              else setOpen(false);
            }
          }}
        />
        {value && (
          <button
            type="button"
            aria-label="Clear stat search"
            className="stat-picker-control"
            onClick={() => {
              onChange("");
              setActive(-1);
              input.current?.focus();
              setOpen(true);
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
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        )}
        <button
          type="button"
          aria-label={open ? "Close stat suggestions" : "Browse stats"}
          className="stat-picker-control"
          aria-expanded={open}
          onClick={() => {
            setActive(-1);
            if (open) setOpen(false);
            else {
              input.current?.focus();
              setOpen(true);
            }
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
            {matches.length} matching stats
          </div>
          <div
            id={id}
            role="listbox"
            aria-label="Stat suggestions"
            className="stat-picker-list"
          >
            {matches.map((label, index) => (
              <div
                key={label}
                id={`${id}-${index}`}
                role="option"
                aria-selected={value === label}
                className={`stat-picker-option ${active === index ? "highlighted" : ""}`}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => choose(label)}
              >
                <StatIcon stat={label} size={20} />
                <span>{label}</span>
                {value === label && (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="m5 12 4 4L19 6" />
                  </svg>
                )}
              </div>
            ))}
          </div>
          {!matches.length && (
            <p className="stat-picker-empty">
              No preset stats match. Your text still filters item effects.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
