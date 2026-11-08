import React, { useState } from "react";

export default function GameImport({ onImport }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const { importGameBuild } = await import("./deadlockBuild.js");
      const draft = await importGameBuild(code);
      onImport(draft);
      setOpen(false);
      setCode("");
    } catch (error) {
      setError(error.message || "Could not import this build.");
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="game-export">
      <button
        onClick={() => setOpen(!open)}
        disabled={pending}
        aria-expanded={open}
      >
        Import from Deadlock
      </button>
      {open && (
        <form
          className="game-export-result"
          onSubmit={submit}
          aria-label="Import from Deadlock"
        >
          <button
            type="button"
            className="export-close"
            disabled={pending}
            onClick={() => setOpen(false)}
          >
            Close
          </button>
          <p>
            Open a build in Deadlock and use its Copy option, then paste the
            build code here.
          </p>
          <p>
            Creates a new draft with its character, categories, items, notes,
            imbues, and ability order. Repeated items are kept in their first
            category. Item annotations and preview stats are not imported.
          </p>
          <label>
            Game build code
            <textarea
              autoFocus
              rows={4}
              value={code}
              maxLength={24000}
              disabled={pending}
              onChange={(e) => {
                setCode(e.target.value);
                setError("");
              }}
            />
          </label>
          {error && <p role="alert">{error}</p>}
          <button
            type="submit"
            disabled={pending || !code.trim()}
            aria-busy={pending}
          >
            {pending ? "Importing…" : "Import as new draft"}
          </button>
        </form>
      )}
    </div>
  );
}
