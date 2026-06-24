import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * Scrolls to the top of the page on every client-side route change.
 * Prevents the browser from preserving the previous page's scroll position
 * when navigating between routes in the SPA.
 *
 * Safe with in-page anchor links (e.g. href="#inquire") because those don't
 * change the Wouter pathname and don't trigger this effect.
 */
export function useScrollToTop() {
  const [pathname] = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
}
