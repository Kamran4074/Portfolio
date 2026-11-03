import { useCallback, useRef } from "react";

// Mouse drag-to-scroll for a horizontal track (touch and trackpads scroll natively).
// A drag that moved is not also a click, so dragging across a slide never opens it.
// `onRelease` gets the track so the caller can snap to the nearest slide.
export default function useDragScroll(trackRef, { onRelease } = {}) {
  const suppressClick = useRef(false);

  const onPointerDown = useCallback(
    (e) => {
      const track = trackRef.current;
      if (!track || e.pointerType !== "mouse" || e.button !== 0) return;
      const start = { x: e.clientX, left: track.scrollLeft };
      let moved = false;

      const move = (ev) => {
        const dx = ev.clientX - start.x;
        if (!moved && Math.abs(dx) > 5) {
          moved = true;
          track.classList.add("is-dragging"); // turns off scroll-snap while dragging
        }
        if (moved) track.scrollLeft = start.left - dx;
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
        if (!moved) return;
        track.classList.remove("is-dragging");
        suppressClick.current = true;
        onRelease?.(track);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
    },
    [trackRef, onRelease]
  );

  const onClickCapture = useCallback((e) => {
    if (!suppressClick.current) return;
    suppressClick.current = false;
    e.preventDefault();
    e.stopPropagation();
  }, []);

  return { onPointerDown, onClickCapture };
}
