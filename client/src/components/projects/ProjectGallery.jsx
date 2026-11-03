import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, LazyMotion, MotionConfig, domAnimation, m, useScroll, useSpring } from "motion/react";
import Icon from "../Icon";
import Lightbox from "./Lightbox";
import useDragScroll from "./useDragScroll";
import { altOf, pad, prefersReducedMotion } from "./media";

const SPRING = { type: "spring", stiffness: 300, damping: 30 };

// A project's screenshots as a horizontal, snap-scrolling strip. Each screenshot has its
// caption underneath and scrolls with it. Works with trackpad/shift+wheel, touch swipe,
// mouse drag, the arrow buttons and the keyboard; click opens the full-screen viewer.
// The page's vertical wheel scrolling is never captured.
export default function ProjectGallery({ project, shots }) {
  const trackRef = useRef(null);
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(null); // index shown in the lightbox, or null
  const n = shots.length;

  const { scrollXProgress } = useScroll({ container: trackRef });
  const progress = useSpring(scrollXProgress, { stiffness: 260, damping: 32, restDelta: 0.001 });

  const goTo = useCallback((i) => {
    const track = trackRef.current;
    const slide = track?.children[Math.max(0, Math.min(i, track.children.length - 1))];
    if (slide) track.scrollTo({ left: slide.offsetLeft, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, []);

  // After a mouse drag, settle on whichever slide is closest.
  const snapNearest = useCallback(
    (track) => {
      const slides = [...track.children];
      const nearest = slides.reduce((best, s, i) => (Math.abs(s.offsetLeft - track.scrollLeft) < Math.abs(slides[best].offsetLeft - track.scrollLeft) ? i : best), 0);
      goTo(nearest);
    },
    [goTo]
  );
  const drag = useDragScroll(trackRef, { onRelease: snapNearest });

  // The active slide is the one mostly in view, however the strip was scrolled.
  useEffect(() => {
    const track = trackRef.current;
    if (!track || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(Number(e.target.dataset.index))),
      { root: track, threshold: 0.6 }
    );
    [...track.children].forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [n]);

  const onKeyDown = (e) => {
    const to = { ArrowRight: active + 1, ArrowLeft: active - 1, Home: 0, End: n - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    goTo(to);
  };

  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <div className="gallery">
          <div
            ref={trackRef}
            className="gallery-track"
            tabIndex={0}
            role="region"
            aria-roledescription="carousel"
            aria-label={`${project.title} screenshots. Use the arrow keys to move between them.`}
            data-lenis-prevent-horizontal
            onKeyDown={onKeyDown}
            {...drag}
          >
            {shots.map((shot, i) => {
              const isActive = i === active;
              return (
                <m.figure
                  key={shot.src}
                  className="gallery-slide"
                  data-index={i}
                  aria-roledescription="slide"
                  aria-label={`${i + 1} of ${n}`}
                  initial={false}
                  animate={{ opacity: isActive ? 1 : 0.5, scale: isActive ? 1 : 0.95 }}
                  transition={SPRING}
                >
                  <button
                    type="button"
                    className="gallery-media"
                    onClick={() => setOpen(i)}
                    aria-label={`View screenshot ${i + 1} full size`}
                    data-cursor="Expand"
                    tabIndex={isActive ? 0 : -1}
                  >
                    <img src={shot.src} alt={altOf(project, shot)} width="1200" height="750" loading="lazy" decoding="async" draggable={false} />
                  </button>
                  <figcaption className="gallery-caption">
                    <span className="gallery-index mono">{pad(i + 1)}</span>
                    <m.span
                      initial={false}
                      animate={{ opacity: isActive ? 1 : 0.55, y: isActive ? 0 : 3 }}
                      transition={SPRING}
                    >
                      {shot.caption || altOf(project, shot)}
                    </m.span>
                  </figcaption>
                </m.figure>
              );
            })}
          </div>

          {n > 1 && (
            <div className="gallery-bar">
              <div className="gallery-progress" aria-hidden="true">
                <m.span style={{ scaleX: progress }} />
              </div>
              <span className="gallery-count mono" aria-live="polite">
                {pad(active + 1)} / {pad(n)}
              </span>
              <button type="button" className="gallery-btn prev" onClick={() => goTo(active - 1)} disabled={active === 0} aria-label="Previous screenshot">
                <Icon name="arrow" size={15} />
              </button>
              <button type="button" className="gallery-btn next" onClick={() => goTo(active + 1)} disabled={active === n - 1} aria-label="Next screenshot">
                <Icon name="arrow" size={15} />
              </button>
            </div>
          )}
        </div>

        <AnimatePresence>
          {open !== null && (
            <Lightbox
              key="lightbox"
              project={project}
              shots={shots}
              index={open}
              onIndex={(i) => {
                setOpen(i);
                goTo(i); // keep the strip in step with the viewer
              }}
              onClose={() => setOpen(null)}
            />
          )}
        </AnimatePresence>
      </MotionConfig>
    </LazyMotion>
  );
}
