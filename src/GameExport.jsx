import React, { useEffect, useRef, useState } from "react";

export default function GameExport({ draft }) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState(null);
  const request = useRef(0);
  useEffect(() => {
    request.current++;
    setPending(false);
    setResult(null);
    return () => {
      request.current++;
    };
  }, [draft]);

  async function copy() {
    const current = ++request.current;
    setPending(true);
    try {
      const { exportGameBuild } = await import("./deadlockBuild.js");
      const code = result?.code || (await exportGameBuild(draft));
      if (current !== request.current) return;
      let copied = false;
      try {
        await navigator.clipboard.writeText(code);
        copied = true;
      } catch {
        /* Keep the code available for manual copying. */
      }
      if (current === request.current) setResult({ code, copied });
    } catch (error) {
      if (current === request.current)
        setResult({
          error:
            error.message || "Could not prepare the build. Try copying again.",
        });
    } finally {
      if (current === request.current) setPending(false);
    }
  }

  return (
    <div className="game-export">
      <button onClick={copy} disabled={pending} aria-busy={pending}>
        {pending ? "Preparing build…" : "Copy for Deadlock"}
      </button>
      {result && (
        <div className="game-export-result">
          <button
            className="export-close"
            onClick={() => setResult(null)}
            aria-label="Close export details"
          >
            Close
          </button>
          <p role="status">
            {result.error ||
              (result.copied
                ? "Build copied. In Deadlock, open Create New Build, click Paste, then save."
                : "Clipboard access was blocked. Select the code below and copy it, then paste it into Create New Build in Deadlock.")}
          </p>
          {result.code && (
            <>
              <p>
                Includes items, categories, optional flags, notes, and assigned
                imbues. Ability point order is included when planned. Preview
                stats are not included.
              </p>
              <label>
                Deadlock build code
                <textarea
                  readOnly
                  rows={3}
                  value={result.code}
                  onFocus={(e) => e.target.select()}
                />
              </label>
            </>
          )}
        </div>
      )}
    </div>
  );
}
