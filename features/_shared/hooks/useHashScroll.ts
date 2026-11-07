import { useEffect } from "react";

/**
 * Scrolls to the element named by the URL hash (e.g. /venues#ceremony) after a
 * client-side navigation, offset so the target lands below the fixed site header.
 *
 * Needed because routes are lazy-loaded and useScrollToTop() resets scroll to the
 * top on every route change, so the browser's native hash jump never happens.
 * Waits (a few frames) for the target to exist, then corrects once more after a
 * short delay in case images above the target changed the layout.
 */
export function useHashScroll() {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;

    let cancelled = false;
    let frames = 0;
    let userScrolled = false;
    const markUser = () => { userScrolled = true; };
    window.addEventListener("wheel", markUser, { passive: true });
    window.addEventListener("touchmove", markUser, { passive: true });
    window.addEventListener("keydown", markUser);

    const scrollToTarget = () => {
      const el = document.getElementById(id);
      if (!el) return false;
      const header = document.querySelector("header");
      const offset = (header?.getBoundingClientRect().height ?? 0) + 16;
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: Math.max(0, top), behavior: "auto" });
      return true;
    };

    const tryScroll = () => {
      if (cancelled) return;
      if (scrollToTarget()) {
        // Second pass once lazy images / fonts above the target have settled.
        window.setTimeout(() => { if (!cancelled && !userScrolled) scrollToTarget(); }, 400);
        return;
      }
      if (++frames < 60) requestAnimationFrame(tryScroll);
    };
    // Defer past useScrollToTop()'s reset, which runs in the same commit.
    requestAnimationFrame(tryScroll);

    return () => {
      cancelled = true;
      window.removeEventListener("wheel", markUser);
      window.removeEventListener("touchmove", markUser);
      window.removeEventListener("keydown", markUser);
    };
  }, []);
}
