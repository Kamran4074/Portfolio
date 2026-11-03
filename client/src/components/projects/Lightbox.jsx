import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, m } from "motion/react";
import Icon from "../Icon";
import { altOf, pad } from "./media";

const EASE = [0.22, 1, 0.36, 1];

// Full-screen viewer for one project's screenshots. Esc closes, arrow keys and swipe
// move between images, focus returns to where it was opened from.
export default function Lightbox({ project, shots, index, onIndex, onClose }) {
  const closeRef = useRef(null);
  const touchX = useRef(null);
  const [direction, setDirection] = useState(0);
  const n = shots.length;
  const shot = shots[index];

  const go = (d) => {
    if (n < 2) return;
    setDirection(d);
    onIndex((index + d + n) % n);
  };

  useEffect(() => {
    const opener = document.activeElement;
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      root.style.overflow = overflow;
      opener?.focus?.({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "Tab") {
        // Keep focus inside the dialog.
        const items = [...document.querySelectorAll(".lightbox button")];
        const i = items.indexOf(document.activeElement);
        const next = e.shiftKey ? (i <= 0 ? items.length - 1 : i - 1) : (i + 1) % items.length;
        e.preventDefault();
        items[next]?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return createPortal(
    <m.div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`${project.title} screenshots`}
      data-lenis-prevent
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - (touchX.current ?? e.changedTouches[0].clientX);
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        touchX.current = null;
      }}
    >
      <div className="lightbox-top">
        <span className="mono">{project.title} · {pad(index + 1)} / {pad(n)}</span>
        <button ref={closeRef} type="button" className="lightbox-btn" onClick={onClose} aria-label="Close">✕</button>
      </div>

      <m.figure
        className="lightbox-figure"
        initial={{ scale: 0.96, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.97, y: 8 }}
        transition={{ duration: 0.35, ease: EASE }}
      >
        <div className="lightbox-stage">
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <m.img
              key={shot.src}
              src={shot.src}
              alt={altOf(project, shot)}
              custom={direction}
              variants={{
                enter: (d) => ({ opacity: 0, x: d * 60 }),
                center: { opacity: 1, x: 0 },
                exit: (d) => ({ opacity: 0, x: d * -60 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: EASE }}
              draggable={false}
            />
          </AnimatePresence>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          {shot.caption && (
            <m.figcaption
              key={shot.src}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25 }}
            >
              {shot.caption}
            </m.figcaption>
          )}
        </AnimatePresence>
      </m.figure>

      {n > 1 && (
        <>
          <button type="button" className="lightbox-btn lightbox-nav prev" onClick={() => go(-1)} aria-label="Previous screenshot">
            <Icon name="arrow" size={18} />
          </button>
          <button type="button" className="lightbox-btn lightbox-nav next" onClick={() => go(1)} aria-label="Next screenshot">
            <Icon name="arrow" size={18} />
          </button>
        </>
      )}
    </m.div>,
    document.body
  );
}
