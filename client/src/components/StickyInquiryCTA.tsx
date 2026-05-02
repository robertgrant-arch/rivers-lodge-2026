import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";

interface Props {
  href: string;
  label: string;
  accentColor?: string;
  /** Selector of the element that, when visible, hides the sticky bar */
  hideWhenVisible?: string;
}

/**
 * A sticky bottom bar that appears after the user scrolls past the hero,
 * and hides when the page-level CTA section comes into view.
 */
export default function StickyInquiryCTA({
  href,
  label,
  accentColor = "var(--gold)",
  hideWhenVisible,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [suppressed, setSuppressed] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 400);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!hideWhenVisible) return;
    const target = document.querySelector(hideWhenVisible);
    if (!target) return;
    const obs = new IntersectionObserver(
      ([entry]) => setSuppressed(entry.isIntersecting),
      { threshold: 0.1 }
    );
    obs.observe(target);
    return () => obs.disconnect();
  }, [hideWhenVisible]);

  const show = visible && !suppressed;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 transition-transform duration-300 ease-in-out"
      style={{ transform: show ? "translateY(0)" : "translateY(100%)" }}
      aria-hidden={!show}
    >
      <div
        className="flex items-center justify-between gap-4 px-5 py-4 border-t"
        style={{
          background: "oklch(0.12 0.015 66 / 0.97)",
          borderColor: "oklch(0.22 0.008 64)",
          backdropFilter: "blur(12px)",
        }}
      >
        <p className="font-sans text-sm text-white/60 hidden sm:block">
          Ready to start planning? We'd love to hear from you.
        </p>
        <div className="flex items-center gap-3 ml-auto">
          <button
            onClick={() => setSuppressed(true)}
            className="text-white/30 hover:text-white/60 transition-colors p-1"
            aria-label="Dismiss"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="1" y1="1" x2="11" y2="11" />
              <line x1="11" y1="1" x2="1" y2="11" />
            </svg>
          </button>
          <Link
            href={href}
            className="btn-primary text-sm whitespace-nowrap"
            style={{ "--btn-accent": accentColor } as React.CSSProperties}
          >
            {label}
          </Link>
        </div>
      </div>
    </div>
  );
}
