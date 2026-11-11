import { useEffect } from "react";

/**
 * Scrolls to the element named by the URL hash (e.g. /venues#ceremony) after a
 * client-side navigation, offset so the target lands below the fixed site header.
 *
 * Needed because routes are lazy-loaded and useScrollToTop() resets scroll to the
 * top on every route change, so the browser's native hash jump never happens.
 * Waits (a few frames) for the target to exist, then corrects once more after a
 * short delay in case images above the target changed the layout.
 *
 * Also handles hash links followed while already on the page (e.g. clicking
 * /lodging#venues on /lodging): wouter's pushState doesn't change the pathname,
 * so the page doesn't re-mount and the browser doesn't jump either.
 */
export function useHashScroll() {
  useEffect(() => {
    const mountPath = window.location.pathname;
    let run = 0; // bumps on each new scroll request so stale retries stop
    let unmounted = false;
    let userScrolled = false;
    const markUser = () => { userScrolled = true; };
    window.addEventListener("wheel", markUser, { passive: true });
    window.addEventListener("touchmove", markUser, { passive: true });
    window.addEventListener("keydown", markUser);

    const scrollToTarget = (id: string) => {
      const el = document.getElementById(id);
      if (!el) return false;
      const header = document.querySelector("header");
      const offset = (header?.getBoundingClientRect().height ?? 0) + 16;
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: Math.max(0, top), behavior: "auto" });
      return true;
    };

    const start = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id || window.location.pathname !== mountPath) return;
      const myRun = ++run;
      userScrolled = false;
      let frames = 0;
      const live = () => !unmounted && myRun === run;
      const tryScroll = () => {
        if (!live()) return;
        if (scrollToTarget(id)) {
          // Second pass once lazy images / fonts above the target have settled.
          window.setTimeout(() => { if (live() && !userScrolled) scrollToTarget(id); }, 400);
          return;
        }
        if (++frames < 60) requestAnimationFrame(tryScroll);
      };
      // Defer past useScrollToTop()'s reset, which runs in the same commit.
      requestAnimationFrame(tryScroll);
    };

    start();
    // Same-page hash navigation (wouter Link → history.pushState, back/forward, plain #links).
    const onNav = () => start();
    window.addEventListener("pushState", onNav);
    window.addEventListener("popstate", onNav);
    window.addEventListener("hashchange", onNav);

    return () => {
      unmounted = true;
      window.removeEventListener("wheel", markUser);
      window.removeEventListener("touchmove", markUser);
      window.removeEventListener("keydown", markUser);
      window.removeEventListener("pushState", onNav);
      window.removeEventListener("popstate", onNav);
      window.removeEventListener("hashchange", onNav);
    };
  }, []);
}
