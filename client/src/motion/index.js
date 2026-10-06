// All scroll and pointer animation lives here. This module is dynamically imported after
// first paint (see useMotion in App.jsx) and only when the visitor allows motion, so GSAP,
// ScrollTrigger and Lenis never block rendering. The HTML is complete without it.
//
// Markup hooks:
//   [data-reveal]          fades/rises in when scrolled into view
//   [data-stagger] > *     children reveal in sequence
//   [data-timeline]        line grows with scroll; each .tl-item reveals node -> [data-seq] parts
//   [data-mask]            clip-path reveal with a slight scale settle (project covers)
//   [data-count]           counts up from 0 to the number already in the text
//   [data-parallax="40"]   desktop-only vertical drift (px across the element's scroll range)
//   [data-magnetic]        follows the pointer slightly (desktop only)
//   [data-glow]            pointer-following glow via --gx/--gy (desktop only)
//   [data-cursor="Label"]  custom cursor shows a label over this element (desktop only)
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { parseStat } from "../components/About";

gsap.registerPlugin(ScrollTrigger);

const EASE = "power3.out";

export function startMotion() {
  const root = document.documentElement;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const cleanups = [];
  const listen = (target, type, fn, opts) => {
    target.addEventListener(type, fn, opts);
    cleanups.push(() => target.removeEventListener(type, fn, opts));
  };
  const ctx = gsap.context(() => {});
  const bound = new WeakSet();
  const fresh = (selector) => gsap.utils.toArray(selector).filter((el) => !bound.has(el) && bound.add(el));

  // ── Smooth scrolling ─────────────────────────────────────────────────────
  // Lenis drives the scroll position and ScrollTrigger reads it on every frame.
  // Touch devices keep native scrolling (Lenis default), which feels better on phones.
  const lenis = new Lenis({ duration: 1.05, easing: (t) => 1 - Math.pow(1 - t, 3) });
  lenis.on("scroll", ScrollTrigger.update);
  const raf = (time) => lenis.raf(time * 1000);
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);
  cleanups.push(() => {
    gsap.ticker.remove(raf);
    lenis.destroy();
  });

  // In-page links go through Lenis. The hash is still pushed so back/forward work; on
  // popstate the browser restores the position itself and Lenis syncs to native scroll.
  listen(document, "click", (e) => {
    const a = e.target.closest?.('a[href^="#"]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const hash = a.getAttribute("href");
    const target = hash === "#top" || hash === "#" ? null : document.querySelector(hash);
    if (hash !== "#top" && hash !== "#" && !target) return;
    e.preventDefault();
    // No offset here: Lenis already applies the CSS scroll-padding-top used for the fixed nav.
    lenis.scrollTo(target || 0);
    if (location.hash !== hash) history.pushState(null, "", hash);
    // Move focus for keyboard and screen reader users without a second jump.
    const focusTarget = target || document.getElementById("main");
    if (focusTarget && hash !== "#main") {
      if (!focusTarget.hasAttribute("tabindex")) focusTarget.setAttribute("tabindex", "-1");
      focusTarget.focus({ preventScroll: true });
    }
  });

  // ── Scroll-triggered animation (re-run by refresh() for new nodes) ─────────
  const bindScroll = () =>
    ctx.add(() => {
      const mobile = window.matchMedia("(max-width: 768px)").matches;

      const reveals = fresh("[data-reveal], [data-stagger] > *");
      // Anything already scrolled past (reload mid-page, or a slow load) is shown at once.
      const passed = reveals.filter((el) => el.getBoundingClientRect().bottom < 0);
      if (passed.length) gsap.set(passed, { opacity: 1, y: 0 });
      if (reveals.length) {
        ScrollTrigger.batch(reveals, {
          start: "top 90%",
          once: true,
          onEnter: (batch) =>
            gsap.to(batch, { opacity: 1, y: 0, duration: mobile ? 0.6 : 0.85, ease: EASE, stagger: 0.08, overwrite: true }),
        });
      }

      fresh("[data-timeline]").forEach((tl) => {
        const line = tl.querySelector(".timeline-line");
        if (line) {
          gsap.fromTo(
            line,
            { scaleY: 0 },
            { scaleY: 1, ease: "none", scrollTrigger: { trigger: tl, start: "top 75%", end: "bottom 65%", scrub: 0.5 } }
          );
        }
      });

      fresh(".tl-item").forEach((item) => {
        const node = item.querySelector(".tl-node");
        const card = item.querySelector(".tl-card");
        const parts = item.querySelectorAll("[data-seq]");
        gsap
          .timeline({ scrollTrigger: { trigger: item, start: "top 82%", once: true } })
          .to(node, { scale: 1, opacity: 1, duration: 0.45, ease: "back.out(2.2)" })
          .to(card, { opacity: 1, x: 0, duration: 0.6, ease: EASE }, "<0.1")
          .to(parts, { opacity: 1, y: 0, duration: 0.55, ease: EASE, stagger: 0.09 }, "<0.15");
      });

      fresh("[data-mask]").forEach((el) => {
        const inner = el.querySelector(".project-cover-inner");
        gsap
          .timeline({ scrollTrigger: { trigger: el, start: "top 88%", once: true } })
          .to(el, { clipPath: "inset(0% 0% 0% 0% round 12px)", duration: 1.1, ease: "power4.inOut" })
          .fromTo(inner, { scale: 1.18 }, { scale: 1, duration: 1.4, ease: "power3.out" }, 0);
      });

      // The target is read when the stat scrolls into view, so live API values are used.
      // Only the existing text node's value is written: React owns that node, and
      // replacing it (textContent =) would detach it from later React updates.
      fresh("[data-count]").forEach((el) => {
        ScrollTrigger.create({
          trigger: el,
          start: "top 90%",
          once: true,
          onEnter: () => {
            const node = el.firstChild;
            const stat = node?.nodeType === Node.TEXT_NODE && parseStat(node.nodeValue);
            if (!stat) return;
            const final = node.nodeValue;
            const decimals = String(stat.value).split(".")[1]?.length || 0;
            const counter = { v: 0 };
            gsap.to(counter, {
              v: stat.value,
              duration: 1.6,
              ease: "power2.out",
              onUpdate: () => (node.nodeValue = `${stat.prefix}${counter.v.toFixed(decimals)}${stat.suffix}`),
              onComplete: () => (node.nodeValue = final),
            });
          },
        });
      });

      // Parallax is decoration, so it is desktop-only.
      if (!mobile) {
        fresh("[data-parallax]").forEach((el) => {
          const amount = Number(el.dataset.parallax) || 40;
          gsap.to(el, { y: amount, ease: "none", scrollTrigger: { trigger: "#top", start: "top top", end: "bottom top", scrub: true } });
        });
      }
    });

  bindScroll();
  root.classList.add("motion-ready");

  // Fonts change text heights, which moves every trigger point.
  document.fonts?.ready.then(() => ScrollTrigger.refresh());

  // ── Pointer effects (desktop with a real mouse only) ─────────────────────
  if (finePointer) {
    // Hero spotlight: one CSS variable pair, written at most once per frame.
    const hero = document.getElementById("top");
    if (hero) {
      let frame = 0;
      listen(hero, "pointermove", (e) => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          const r = hero.getBoundingClientRect();
          hero.style.setProperty("--mx", `${e.clientX - r.left}px`);
          hero.style.setProperty("--my", `${e.clientY - r.top}px`);
        });
      });
      cleanups.push(() => cancelAnimationFrame(frame));
    }

    // Card glow follows the pointer inside [data-glow] elements.
    listen(document, "pointermove", (e) => {
      const card = e.target.closest?.("[data-glow]");
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty("--gx", `${e.clientX - r.left}px`);
      card.style.setProperty("--gy", `${e.clientY - r.top}px`);
    }, { passive: true });

    // Magnetic CTAs: pulled toward the pointer, springing back when it leaves.
    let magnet = null;
    listen(document, "pointermove", (e) => {
      const el = e.target.closest?.("[data-magnetic]");
      if (magnet && magnet !== el) gsap.to(magnet, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.5)" });
      magnet = el;
      if (!el) return;
      const r = el.getBoundingClientRect();
      gsap.to(el, {
        x: (e.clientX - (r.left + r.width / 2)) * 0.25,
        y: (e.clientY - (r.top + r.height / 2)) * 0.35,
        duration: 0.4,
        ease: "power3.out",
      });
    }, { passive: true });

    cleanups.push(startCursor(listen));
  }

  return {
    refresh() {
      bindScroll();
      ScrollTrigger.refresh();
    },
    destroy() {
      cleanups.splice(0).reverse().forEach((fn) => fn());
      ctx.revert(); // kills every ScrollTrigger/tween and removes inline styles
      gsap.set("[data-magnetic]", { clearProps: "transform" });
      root.classList.remove("motion-ready");
    },
  };
}

// A follower ring layered on top of the normal cursor. The system cursor is never hidden,
// so text selection, inputs and accessibility tools behave exactly as usual.
function startCursor(listen) {
  const el = document.createElement("div");
  el.className = "cursor";
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = '<span class="cursor-label"></span>';
  document.body.appendChild(el);
  const label = el.firstChild;

  const x = gsap.quickTo(el, "x", { duration: 0.35, ease: "power3.out" });
  const y = gsap.quickTo(el, "y", { duration: 0.35, ease: "power3.out" });
  let visible = false;

  listen(document, "pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    if (!visible) {
      gsap.set(el, { x: e.clientX, y: e.clientY });
      visible = true;
    }
    x(e.clientX);
    y(e.clientY);
    el.classList.add("is-visible");
  }, { passive: true });

  listen(document, "pointerover", (e) => {
    const t = e.target;
    const labelled = t.closest?.("[data-cursor]");
    const text = t.closest?.("input, textarea, select, [contenteditable]");
    const interactive = t.closest?.("a, button, [role='button'], label");
    el.classList.toggle("is-hidden", !!text);
    el.classList.toggle("is-label", !!labelled);
    el.classList.toggle("is-button", !labelled && !!t.closest?.("button, .btn"));
    el.classList.toggle("is-link", !labelled && !!interactive);
    label.textContent = labelled ? labelled.dataset.cursor : "";
  });

  listen(document.documentElement, "pointerleave", () => el.classList.remove("is-visible"));
  listen(document, "pointerdown", () => el.classList.add("is-down"));
  listen(document, "pointerup", () => el.classList.remove("is-down"));

  return () => el.remove();
}
