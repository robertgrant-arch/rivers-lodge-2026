import { useEffect, useRef } from "react";

/**
 * Attaches IntersectionObserver to a container element.
 * Any child with `data-fade` will receive the `.visible` class
 * when it enters the viewport, triggering the CSS fade-up animation.
 *
 * Children with `data-fade-delay="N"` (N in ms) get a staggered delay.
 *
 * Respects `prefers-reduced-motion` — skips all transforms when enabled.
 */
export function useScrollAnimation(threshold = 0.12) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    // Collect all fade targets inside this container
    const targets = Array.from(
      container.querySelectorAll<HTMLElement>("[data-fade]")
    );
    if (targets.length === 0) return;

    const prefersReduced =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      // Skip animation entirely — make all elements visible immediately
      targets.forEach((el) => el.classList.add("visible"));
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            const delay = el.dataset.fadeDelay ? parseInt(el.dataset.fadeDelay) : 0;
            setTimeout(() => el.classList.add("visible"), delay);
            obs.unobserve(el);
          }
        });
      },
      { threshold }
    );

    targets.forEach((el) => obs.observe(el));

    return () => obs.disconnect();
  }, [threshold]);

  return ref;
}

/**
 * Single-element fade-up hook (for standalone elements not in a group).
 */
export function useFadeUp(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReduced =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      el.classList.add("visible");
      return;
    }

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("visible");
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return ref;
}
