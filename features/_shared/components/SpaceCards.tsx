import { useEffect, useRef } from "react";
import { Link } from "wouter";
import Picture from "@shared/components/Picture";

/**
 * "Every space is yours." photo-card section, first built for /weddings and
 * shared with /corporate-events and /membership. Each card is a whole-card link:
 * image, gradient and text are sibling layers inside the positioned link.
 */

export type SpaceCardItem = { label: string; href: string; img: string; alt: string };

const ACCENT = "#9B4D19";
const TEXT_SHADOW = "0 1px 3px rgba(0,0,0,0.55), 0 2px 14px rgba(0,0,0,0.35)";
// A light gradient along the bottom edge only.
const CARD_GRADIENT = "linear-gradient(to top, rgba(43,40,35,0.55) 0%, rgba(43,40,35,0.28) 22%, rgba(43,40,35,0) 45%)";

// Literal class names so Tailwind generates them. Desktop columns = number of cards.
const MD_COLS: Record<number, string> = {
  1: "md:grid-cols-1",
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
};

function SpaceCard({ label, href, img, alt, sizes }: SpaceCardItem & { sizes: string }) {
  return (
    <Link href={href} aria-label={`${label}: view details`} className="group relative block overflow-hidden aspect-[4/3] md:aspect-[4/5] bg-[#2B2823] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#576276]">
      <Picture src={img} alt={alt} className="absolute inset-0 w-full h-full" imgClassName="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04] group-focus-visible:scale-[1.04]" sizes={sizes} loading="lazy" />
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none transition-opacity duration-300 opacity-90 group-hover:opacity-100" style={{ background: CARD_GRADIENT }} />
      <div className="absolute inset-x-0 bottom-0 p-7 lg:p-8 flex items-end justify-between gap-4">
        <div>
          <div aria-hidden="true" style={{ height: "1px", width: "1.5rem", backgroundColor: ACCENT, marginBottom: "0.75rem" }} />
          <h3 className="font-serif text-white text-2xl lg:text-3xl leading-tight" style={{ textShadow: TEXT_SHADOW }}>{label}</h3>
        </div>
        <span aria-hidden="true" style={{ textShadow: TEXT_SHADOW }} className="text-white text-xl transition-transform duration-300 group-hover:translate-x-1">→</span>
      </div>
    </Link>
  );
}

/** The card grid: one column on mobile, one column per card from `md` up. */
export function SpaceCardGrid({ cards }: { cards: SpaceCardItem[] }) {
  const cols = MD_COLS[cards.length] ?? "md:grid-cols-3";
  const sizes = `(max-width: 767px) 100vw, ${Math.round(100 / Math.max(1, Math.min(cards.length, 4)))}vw`;
  return (
    <ul className={`grid grid-cols-1 ${cols} gap-4 lg:gap-6`}>
      {cards.map((c) => (
        <li key={c.label}><SpaceCard {...c} sizes={sizes} /></li>
      ))}
    </ul>
  );
}

function useFadeUp(t = 0.12) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { el.classList.add("visible"); return; }
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.add("visible"); obs.disconnect(); } }, { threshold: t });
    obs.observe(el); return () => obs.disconnect();
  }, [t]);
  return ref;
}

/**
 * Full section: labeled Night divider band, then a Sand section with the accent
 * rule, eyebrow, h2 and the card grid. `label` is used for both divider and eyebrow.
 */
export default function SpaceCardsSection({ label, heading, cards }: { label: string; heading: string; cards: SpaceCardItem[] }) {
  const ref = useFadeUp();
  return (
    <>
      <div className="bg-[#2B2823] py-6 lg:py-8" role="presentation">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14 flex items-center justify-center gap-6">
          <div aria-hidden="true" className="flex-1 h-px bg-[#E0D3BD]/25" />
          <p className="text-[11px] uppercase tracking-[0.2em] font-sans text-[#E0D3BD]/80 whitespace-nowrap">{label}</p>
          <div aria-hidden="true" className="flex-1 h-px bg-[#E0D3BD]/25" />
        </div>
      </div>
      <section ref={ref as React.RefObject<HTMLElement>} className="fade-up py-24 md:py-32 lg:py-40 bg-rl-sand">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-14">
          <div className="mb-14">
            <div aria-hidden="true" style={{ height: "1px", width: "2rem", backgroundColor: ACCENT, marginBottom: "1.25rem" }} />
            <p className="eyebrow text-[#2B2823]/75 mb-4">{label}</p>
            <h2 className="font-serif font-light text-[#2B2823] leading-tight" style={{ fontSize: "clamp(1.75rem,3vw,2.5rem)" }}>
              {heading}
            </h2>
          </div>
          <SpaceCardGrid cards={cards} />
        </div>
      </section>
    </>
  );
}
