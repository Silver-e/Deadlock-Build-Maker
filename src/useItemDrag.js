import { useEffect, useRef, useState } from "react";

// A dedicated touch-action:none handle leaves the rest of each card scrollable.
export default function useItemDrag(onMove) {
  const session = useRef(null);
  const callback = useRef(onMove);
  const suppressClickUntil = useRef(0);
  const [drag, setDrag] = useState(null);
  callback.current = onMove;

  useEffect(() => {
    let frame;
    const locate = (current) => {
      // Status messages and the floating preview must not block a drop target.
      const element = document
        .elementsFromPoint(current.x, current.y)
        .find((node) => node.closest("[data-category-id]"));
      const category = element?.closest("[data-category-id]");
      const card = element?.closest("[data-draft-item]");
      current.target = category?.dataset.categoryId ?? null;
      current.before = card?.dataset.draftItem ?? null;
      setDrag((previous) => {
        const next = {
          id: current.id,
          x: current.x,
          y: current.y,
          target: current.target,
          before: current.before,
        };
        return previous &&
          Object.keys(next).every((key) => next[key] === previous[key])
          ? previous
          : next;
      });
    };
    const tick = () => {
      const current = session.current;
      if (!current) return;
      if (current.active) {
        // Scroll from the innermost scrollable ancestor out to the page.
        let element = document.querySelector(".categories");
        while (element) {
          const page = element === document.scrollingElement;
          const rect = page
            ? { top: 0, bottom: window.innerHeight }
            : element.getBoundingClientRect();
          const scrollable =
            page || /(auto|scroll)/.test(getComputedStyle(element).overflowY);
          if (scrollable && element.scrollHeight > element.clientHeight) {
            const distance =
              current.y < rect.top + 64
                ? -12
                : current.y > rect.bottom - 64
                  ? 12
                  : 0;
            const previous = element.scrollTop;
            element.scrollTop += distance;
            if (element.scrollTop !== previous) break;
          }
          element = element.parentElement;
        }
        locate(current);
      }
      frame = requestAnimationFrame(tick);
    };
    const move = (event) => {
      const current = session.current;
      if (!current || current.pointerId !== event.pointerId) return;
      current.x = event.clientX;
      current.y = event.clientY;
      if (
        Math.hypot(current.x - current.startX, current.y - current.startY) >= 6
      )
        current.active = true;
      if (current.active) {
        event.preventDefault();
        locate(current);
      }
    };
    const finish = (event, cancelled = false) => {
      const current = session.current;
      if (
        !current ||
        (event.pointerId != null && event.pointerId !== current.pointerId)
      )
        return;
      if (current.active) {
        suppressClickUntil.current = Date.now() + 500;
        if (!cancelled) {
          current.x = event.clientX;
          current.y = event.clientY;
          locate(current);
          if (current.target)
            callback.current(current.id, current.target, current.before);
        }
      }
      session.current = null;
      cancelAnimationFrame(frame);
      setDrag(null);
    };
    const cancel = (event) => finish(event, true);
    const key = (event) => {
      if (event.key === "Escape") cancel(event);
    };
    const start = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(tick);
    };
    window.addEventListener("pointerdown", start);
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("keydown", key);
    window.addEventListener("blur", cancel);
    return () => {
      session.current = null;
      cancelAnimationFrame(frame);
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("keydown", key);
      window.removeEventListener("blur", cancel);
    };
  }, []);

  return {
    drag,
    start(event, id) {
      if (!event.isPrimary || event.button !== 0 || session.current) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      session.current = {
        id,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        x: event.clientX,
        y: event.clientY,
        active: false,
      };
    },
    suppressClick() {
      return Date.now() < suppressClickUntil.current;
    },
    isPending() {
      return !!session.current;
    },
  };
}
